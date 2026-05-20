import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Share,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { DOCTOR_HOME, TOKEN_KEY, COLORS } from '../constants/config';
import WebViewContainer from '../components/WebViewContainer';
import { handleCameraMessage } from '../services/camera';
import { sendPushToken } from '../services/notifications';

interface Props {
  onLogout: () => void;
  deepLinkUrl: string | null;
  onDeepLinkHandled: () => void;
}

export default function MainScreen({ onLogout, deepLinkUrl, onDeepLinkHandled }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(DOCTOR_HOME);

  useEffect(() => {
    if (deepLinkUrl) {
      webViewRef.current?.injectJavaScript(
        `window.location.href = ${JSON.stringify(deepLinkUrl)};`
      );
      onDeepLinkHandled();
    }
  }, [deepLinkUrl]);

  useEffect(() => {
    sendPushToken().catch(() => null);
  }, []);

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type: string;
          payload?: Record<string, unknown>;
        };

        switch (data.type) {
          case 'camera':
            await handleCameraMessage(data as Parameters<typeof handleCameraMessage>[0], webViewRef.current);
            break;

          case 'push-token':
            await sendPushToken();
            break;

          case 'haptic':
            await Haptics.impactAsync(
              data.payload?.style === 'heavy'
                ? Haptics.ImpactFeedbackStyle.Heavy
                : Haptics.ImpactFeedbackStyle.Medium
            );
            break;

          case 'share':
            await Share.share({
              message: (data.payload?.text as string) ?? '',
              url: (data.payload?.url as string) ?? undefined,
            });
            break;

          case 'logout':
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            onLogout();
            break;
        }
      } catch {}
    },
    [onLogout]
  );

  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url ?? '';
      setCurrentUrl(url);
      if (url.includes('/sign-in') || (url.includes('/doctor-login') && !url.includes('/doctor-home'))) {
        SecureStore.deleteItemAsync(TOKEN_KEY)
          .then(() => onLogout())
          .catch(() => onLogout());
      }
    },
    [onLogout]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const isLoginPage =
    currentUrl.includes('/sign-in') || currentUrl.includes('/doctor-login');

  if (isOffline) {
    return (
      <SafeAreaView style={styles.offline}>
        <Text style={styles.offlineTitle}>Нет соединения</Text>
        <Text style={styles.offlineText}>Проверьте подключение к интернету</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setIsOffline(false);
            setWebViewKey((k) => k + 1);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={isLoginPage ? [] : ['top']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accentBlue}
            colors={[COLORS.accentBlue]}
          />
        }
        scrollEnabled={false}
      >
        <WebViewContainer
          key={webViewKey}
          ref={webViewRef}
          source={{ uri: DOCTOR_HOME }}
          onMessage={onMessage}
          onNavigationStateChange={onNavigationStateChange}
          onError={() => setIsOffline(true)}
          onHttpError={({ nativeEvent }) => {
            if ((nativeEvent as { statusCode?: number }).statusCode !== undefined &&
                (nativeEvent as { statusCode: number }).statusCode >= 500) {
              setIsOffline(true);
            }
          }}
          allowsBackForwardNavigationGestures
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  offline: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryBtn: {
    backgroundColor: COLORS.accentBlue,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
