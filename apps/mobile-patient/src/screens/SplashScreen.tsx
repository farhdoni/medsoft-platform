import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as SplashScreenExpo from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthToken, isBiometricEnabled } from '../services/auth';
import { getDeviceLanguage } from '../utils/locale';
import type { Screen } from '../../App';

type Props = { onNavigate: (screen: Screen) => void };

// Matches the previous hand-rolled progress bar's fixed duration — same
// pacing users already saw, just presented by the animated HTML now.
const MIN_DISPLAY_MS = 2000;

// If the WebView (asset load, page JS, or the aivita:splash-done bridge)
// never reports back for any reason, don't strand the user on the splash
// forever — fall through to the already-resolved route.
const HIDE_FALLBACK_MS = 4000;

// Bridges the approved splash HTML's page-internal `aivita:splash-done`
// CustomEvent out to React Native — the file only does `window.dispatchEvent`,
// which doesn't cross the WebView boundary on its own. This is injected from
// the native side, not a change to the approved file itself.
const BRIDGE_SCRIPT = `
  (function() {
    window.addEventListener('aivita:splash-done', function() {
      window.ReactNativeWebView.postMessage('splash-done');
    });
    true;
  })();
`;

export function SplashScreen({ onNavigate }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const decisionRef = useRef<Screen>('login');
  const finishedRef = useRef(false);

  function navigateOnce(screen: Screen) {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    onNavigate(screen);
  }

  // Resolve the local HTML asset to a loadable URI, and only then hide the
  // native (instant, static) splash — both share the same #0E1A2B background,
  // so there's no flash either way, but this ordering avoids a blank frame.
  useEffect(() => {
    let cancelled = false;
    Asset.fromModule(require('../../assets/splash/aivita-splash.html'))
      .downloadAsync()
      .then((asset) => {
        if (!cancelled) setHtmlUri(asset.localUri ?? asset.uri);
      })
      .catch(() => {
        // Asset failed to resolve — the routing effect below still runs and
        // still navigates via the fallback timer, just without the animation.
      })
      .finally(() => {
        SplashScreenExpo.hideAsync();
      });
    return () => { cancelled = true; };
  }, []);

  // Same routing decision as before, unchanged — only WHEN it's acted on
  // changed (now gated on the splash's own hide animation via the bridge
  // message, instead of firing straight off a bare setTimeout).
  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    (async () => {
      let next: Screen = 'login';
      try {
        const [token, onboardingDone, biometricEnabled] = await Promise.all([
          getAuthToken(),
          AsyncStorage.getItem('onboarding_done'),
          isBiometricEnabled(),
        ]);

        if (!onboardingDone) next = 'onboarding';
        else if (!token) next = 'login';
        // If biometrics is enabled → show lock screen (handles prompt + fallback)
        else if (biometricEnabled) next = 'biometric';
        else next = 'main';
      } catch {
        next = 'login';
      }

      if (cancelled) return;
      decisionRef.current = next;

      const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt));
      setTimeout(() => {
        if (cancelled || finishedRef.current) return;
        finishedRef.current = true;
        webViewRef.current?.injectJavaScript(
          'window.AivitaSplash && window.AivitaSplash.finish(); true;'
        );
        // Safety net — see HIDE_FALLBACK_MS above.
        setTimeout(() => navigateOnce(decisionRef.current), HIDE_FALLBACK_MS);
      }, wait);
    })();

    return () => { cancelled = true; };
  }, []);

  // Smooth progress toward the minimum display window. There's no multi-step
  // signal from the 3 fast SecureStore/AsyncStorage reads above (they resolve
  // in a few ms) — this reflects elapsed time, not a fabricated fraction.
  useEffect(() => {
    if (!htmlUri) return;
    const startedAt = Date.now();
    const tick = setInterval(() => {
      if (finishedRef.current) { clearInterval(tick); return; }
      const p = Math.min(0.9, (Date.now() - startedAt) / MIN_DISPLAY_MS);
      webViewRef.current?.injectJavaScript(
        `window.AivitaSplash && window.AivitaSplash.setProgress(${p}); true;`
      );
    }, 150);
    return () => clearInterval(tick);
  }, [htmlUri]);

  function handleMessage(event: WebViewMessageEvent) {
    if (event.nativeEvent.data === 'splash-done') {
      navigateOnce(decisionRef.current);
    }
  }

  if (!htmlUri) {
    // Native expo-splash (#0E1A2B) is still showing behind this — same
    // background, so a blank view here doesn't flash.
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: `${htmlUri}?lang=${getDeviceLanguage()}&sound=0&demo=0&autostart=1` }}
        injectedJavaScript={BRIDGE_SCRIPT}
        onMessage={handleMessage}
        originWhitelist={['*']}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1A2B' },
  webview: { flex: 1, backgroundColor: '#0E1A2B' },
});
