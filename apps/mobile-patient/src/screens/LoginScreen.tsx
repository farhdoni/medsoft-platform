import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { WEB_URL } from '../constants/config';
import type { Screen } from '../../App';

const AUTH_PATHS = ['/home', '/profile', '/checkup', '/chats', '/doctors', '/ai-checkup'];

type Props = { onNavigate: (screen: Screen) => void };

export function LoginScreen({ onNavigate }: Props) {
  const webViewRef = useRef<WebView>(null);

  const handleNavigationChange = useCallback(
    async (nav: WebViewNavigation) => {
      const isAuthPage = AUTH_PATHS.some((p) => nav.url.includes(p));
      const isSignPage = nav.url.includes('/sign-') || nav.url.includes('/forgot');

      if (isAuthPage && !isSignPage) {
        await SecureStore.setItemAsync('auth_token', 'web_session');
        onNavigate('main');
      }
    },
    [onNavigate]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        ref={webViewRef}
        source={{ uri: `${WEB_URL}/ru/sign-in` }}
        onNavigationStateChange={handleNavigationChange}
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
