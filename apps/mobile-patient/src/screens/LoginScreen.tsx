import React, { useRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WEB_URL } from '../constants/config';
import { trackAuthSuccess } from '../services/analytics';
import {
  getAuthToken,
  clearAuthToken,
  getRefreshToken,
  refreshSessionToken,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../services/auth';
import type { Screen } from '../../App';

const AUTH_PATHS = ['/home', '/profile', '/checkup', '/chats', '/doctors', '/ai-checkup'];

// Shown at most once — never nags on every login if the user dismissed it.
const BIOMETRIC_PROMPT_SHOWN_KEY = 'aivita:biometric-prompt-shown';

type Props = { onNavigate: (screen: Screen) => void };

function postToWeb(webViewRef: React.RefObject<WebView | null>, eventName: string, detail: unknown) {
  webViewRef.current?.injectJavaScript(
    `(function(){window.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)},{detail:${JSON.stringify(
      detail
    )}}));true;})();`
  );
}

export function LoginScreen({ onNavigate }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [bioAvailable, setBioAvailable] = useState(false);

  // Whether the sign-in form should offer a biometric shortcut: hardware
  // present, enrolled, the user opted in before, and there's a saved session
  // to actually restore. Re-checked on mount — this screen only remounts on
  // logout/cold-start-without-a-valid-token, both of which are exactly when
  // this needs to be re-evaluated.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hardware, enrolled, enabled, token] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        isBiometricEnabled(),
        getAuthToken(),
      ]);
      if (!cancelled) setBioAvailable(hardware && enrolled && enabled && !!token);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Push the resolved value into the WebView both ways: injectedJavaScript
  // covers the common case (this resolves before the page finishes loading),
  // this effect covers the race where the page loaded first — same pattern
  // MainScreen.tsx already uses for pushToken/biometricEnabled.
  useEffect(() => {
    postToWeb(webViewRef, 'aivita-biometric-login-available', { available: bioAvailable });
  }, [bioAvailable]);

  const maybeOfferBiometricEnrollment = useCallback(async () => {
    try {
      const [hardware, enrolled, enabled, alreadyAsked] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        isBiometricEnabled(),
        AsyncStorage.getItem(BIOMETRIC_PROMPT_SHOWN_KEY),
      ]);
      if (!hardware || !enrolled || enabled || alreadyAsked) return;
      await AsyncStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, '1');

      Alert.alert(
        'Вход по отпечатку',
        'В следующий раз можно будет входить по отпечатку или Face ID вместо пароля.',
        [
          { text: 'Не сейчас', style: 'cancel' },
          {
            text: 'Включить',
            onPress: async () => {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Подтвердите отпечаток для включения биометрии',
                cancelLabel: 'Отмена',
                fallbackLabel: 'Пароль',
              }).catch(() => null);
              if (result?.success) {
                await setBiometricEnabled(true);
                setBioAvailable(true);
              }
            },
          },
        ]
      );
    } catch {
      // Best-effort onboarding nudge — never block login on it.
    }
  }, []);

  const handleNavigationChange = useCallback(
    async (nav: WebViewNavigation) => {
      const isAuthPage = AUTH_PATHS.some((p) => nav.url.includes(p));
      const isSignPage = nav.url.includes('/sign-') || nav.url.includes('/forgot');

      if (isAuthPage && !isSignPage) {
        // Real refresh token (7 days), not the old 'web_session' placeholder —
        // this is what a later biometric unlock restores the session from.
        // isAuthenticated()/getAuthToken() only null-check this key, so
        // swapping the placeholder for real data changes nothing there.
        const refreshToken = await getRefreshToken().catch(() => null);
        await SecureStore.setItemAsync('auth_token', refreshToken ?? 'web_session');
        trackAuthSuccess('mobile_login');
        void maybeOfferBiometricEnrollment();
        onNavigate('main');
      }
    },
    [onNavigate, maybeOfferBiometricEnrollment]
  );

  // Bridge target for the sign-in page's fingerprint icon / quick-login
  // button (apps/aivita sign-in). Same postMessage pattern MainScreen.tsx
  // already uses for sync-medications etc.
  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type !== 'biometric-login-request') return;

      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hardware || !enrolled) {
        postToWeb(webViewRef, 'aivita-biometric-login-result', { success: false, reason: 'not_supported' });
        setBioAvailable(false);
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Войдите в AIVITA',
        cancelLabel: 'Отмена',
        fallbackLabel: 'Пароль',
      });
      if (!auth.success) {
        postToWeb(webViewRef, 'aivita-biometric-login-result', { success: false, reason: 'failed' });
        return;
      }

      const storedToken = await getAuthToken();
      if (!storedToken) {
        postToWeb(webViewRef, 'aivita-biometric-login-result', { success: false, reason: 'no_session' });
        setBioAvailable(false);
        return;
      }

      // Fingerprint confirmed the PERSON — this confirms the SESSION is still
      // usable. A stale/1h-expired access token is the normal case (that's
      // the whole point of biometric unlock); mint a fresh one from the
      // 7-day refresh token BEFORE navigating, so MainScreen's WebView loads
      // straight into /home instead of bouncing back to /sign-in.
      const fresh = await refreshSessionToken(storedToken);
      if (!fresh) {
        // Refresh token itself is dead (>7 days, or revoked server-side) —
        // nothing left to restore. Drop the stale credential so the icon
        // stops offering a shortcut that can only ever fail.
        await Promise.all([clearAuthToken(), setBiometricEnabled(false)]);
        setBioAvailable(false);
        postToWeb(webViewRef, 'aivita-biometric-login-result', { success: false, reason: 'session_expired' });
        return;
      }

      trackAuthSuccess('mobile_biometric_login');
      onNavigate('main');
    },
    [onNavigate]
  );

  const injectedJavaScript = `
    (function() {
      window.__AIVITA_BIOMETRIC_LOGIN_AVAILABLE__ = ${JSON.stringify(bioAvailable)};
      true;
    })();
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        ref={webViewRef}
        source={{ uri: `${WEB_URL}/ru/sign-in` }}
        onNavigationStateChange={handleNavigationChange}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#c87d8a" />
          </View>
        )}
        startInLoadingState
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf9f7',
  },
});
