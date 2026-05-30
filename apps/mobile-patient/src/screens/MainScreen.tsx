import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Share,
  Linking,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { WEB_URL } from '../constants/config';
import { registerForPushNotifications, sendPushTokenToServer } from '../services/notifications';
import { takePhoto, pickFromGallery } from '../services/camera';
import type { Screen } from '../../App';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  onNavigate: (screen: Screen) => void;
  initialDeepLink?: string | null;
};

function deepLinkToPath(url: string): string | null {
  try {
    // Handle aivita:// scheme
    const withProto = url.startsWith('aivita://') ? url.replace('aivita://', 'aivita-app://') : url;
    const parsed = new URL(withProto);
    const path = parsed.host + parsed.pathname;
    if (path.startsWith('chat/')) return `/ru/chats/${path.slice(5)}`;
    if (path.startsWith('doctor/')) return `/ru/doctors/${path.slice(7)}`;
    if (path === 'checkup') return '/ru/ai-checkup';
    return null;
  } catch {
    return null;
  }
}

export function MainScreen({ onNavigate, initialDeepLink }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [webUrl, setWebUrl] = useState(`${WEB_URL}/ru/home`);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webViewAtTop, setWebViewAtTop] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (initialDeepLink) {
      const path = deepLinkToPath(initialDeepLink);
      if (path) setWebUrl(`${WEB_URL}${path}`);
    }
  }, [initialDeepLink]);

  useEffect(() => {
    registerForPushNotifications().then(async (token) => {
      if (token) {
        setPushToken(token);
        const deviceId = `${Platform.OS}-${Date.now()}`;
        await sendPushTokenToServer(token, deviceId).catch(() => {});
      }
    });

    // Handle notification tap → navigate WebView
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url as string | undefined;
      if (url) {
        const path = deepLinkToPath(url);
        if (path) {
          webViewRef.current?.injectJavaScript(
            `window.location.href = ${JSON.stringify(`${WEB_URL}${path}`)}; true;`
          );
        }
      }
    });

    return () => sub.remove();
  }, []);

  // Re-inject push token into WebView when it becomes available
  useEffect(() => {
    if (pushToken) {
      webViewRef.current?.injectJavaScript(`
        window.__AIVITA_PUSH_TOKEN__ = ${JSON.stringify(pushToken)};
        window.dispatchEvent(new CustomEvent('aivita-push-token-ready', {
          detail: { pushToken: ${JSON.stringify(pushToken)} }
        }));
        true;
      `);
    }
  }, [pushToken]);

  const injectedJavaScript = `
    (function() {
      window.__AIVITA_PLATFORM__ = ${JSON.stringify(Platform.OS)};
      window.__AIVITA_PUSH_TOKEN__ = ${JSON.stringify(pushToken || '')};

      window.addEventListener('scroll', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: '__scroll__',
          y: window.scrollY
        }));
      }, { passive: true });

      window.dispatchEvent(new CustomEvent('aivita-native-ready', {
        detail: {
          platform: ${JSON.stringify(Platform.OS)},
          pushToken: ${JSON.stringify(pushToken || '')}
        }
      }));
      true;
    })();
  `;

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case '__scroll__':
          setWebViewAtTop(msg.y === 0);
          break;

        case 'open-camera': {
          const base64 = await takePhoto();
          if (base64) {
            const payload = JSON.stringify({ dataUrl: `data:image/jpeg;base64,${base64}` });
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-camera-result',{detail:${payload}}));true;})();`
            );
          }
          break;
        }

        case 'open-gallery': {
          const base64 = await pickFromGallery();
          if (base64) {
            const payload = JSON.stringify({ dataUrl: `data:image/jpeg;base64,${base64}` });
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-gallery-result',{detail:${payload}}));true;})();`
            );
          }
          break;
        }

        case 'share':
          await Share.share({
            message: (msg.text as string) || (msg.url as string) || 'AIVITA',
            url: msg.url as string | undefined,
          }).catch(() => {});
          break;

        case 'haptic':
          await Haptics.impactAsync(
            msg.style === 'heavy'
              ? Haptics.ImpactFeedbackStyle.Heavy
              : msg.style === 'light'
              ? Haptics.ImpactFeedbackStyle.Light
              : Haptics.ImpactFeedbackStyle.Medium
          ).catch(() => {});
          break;

        case 'open-external':
          if (msg.url) await Linking.openURL(msg.url as string).catch(() => {});
          break;

        case 'push-token':
          if (msg.token) {
            setPushToken(msg.token as string);
            const deviceId = `${Platform.OS}-${Date.now()}`;
            await sendPushTokenToServer(msg.token as string, deviceId).catch(() => {});
          }
          break;

        case 'logout':
          await SecureStore.deleteItemAsync('auth_token');
          onNavigate('login');
          break;

        default:
          break;
      }
    },
    [onNavigate]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
  }, []);

  const handleLoadEnd = useCallback(() => {
    setRefreshing(false);
    setIsOffline(false);
  }, []);

  const handleError = useCallback(() => {
    setIsOffline(true);
    setRefreshing(false);
  }, []);

  if (isOffline) {
    return (
      <SafeAreaView style={styles.offlineContainer}>
        <Text style={styles.offlineTitle}>Нет интернета</Text>
        <Text style={styles.offlineSubtitle}>
          Проверьте подключение и попробуйте снова
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          activeOpacity={0.85}
          onPress={() => {
            setIsOffline(false);
            webViewRef.current?.reload();
          }}
        >
          <Text style={styles.retryBtnText}>Повторить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={false}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#c87d8a"
            colors={['#c87d8a']}
            enabled={webViewAtTop}
          />
        }
      >
        <WebView
          ref={webViewRef}
          source={{ uri: webUrl }}
          style={{ height: SCREEN_HEIGHT }}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          allowsBackForwardNavigationGestures
          // Allow inline media & microphone access
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          // Grant mic/camera permission requests automatically (user already approved natively)
          mediaCapturePermissionGrantType="grantIfSameHostElseDeny"
          // ── Scroll fixes ──────────────────────────────────────────────────
          // Disable Android over-scroll glow so it doesn't compete with CSS scroll
          overScrollMode="never"
          // Allow nested scrollable web content (chat messages, lists, etc.)
          nestedScrollEnabled
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf9f7',
    paddingHorizontal: 32,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  offlineSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#c87d8a',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 28,
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
