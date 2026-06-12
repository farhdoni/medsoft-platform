import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Share,
  Linking,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { WEB_URL } from '../constants/config';
import { isBiometricEnabled, setBiometricEnabled } from '../services/auth';
import {
  registerForPushNotifications,
  sendPushTokenToServer,
  scheduleMedicationReminders,
  registerNotificationCategories,
  addMedicationResponseListener,
  type MedScheduleForNotif,
} from '../services/notifications';
import { syncToday as hcSyncToday, requestPermissions, checkAvailability } from '../services/healthConnect';
import { takePhoto, pickFromGallery } from '../services/camera';
import type { Screen } from '../../App';

const { height: _SCREEN_HEIGHT } = Dimensions.get('window'); // kept for potential future use

// ─── [MEDS-DEBUG] In-app log panel ───────────────────────────────────────────
// Intercepts console.log lines that start with [MEDS-DEBUG] and stores them
// so they're visible on-screen in release builds (no USB / Metro needed).
// REMOVE this block and <DebugPanel /> before the next production release.
const _debugLogs: string[] = [];
const _debugListeners: Array<(logs: string[]) => void> = [];
const _origLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
  _origLog(...args);
  const line = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  if (line.includes('[MEDS-DEBUG]')) {
    _debugLogs.push(`${new Date().toTimeString().slice(0,8)} ${line}`);
    if (_debugLogs.length > 200) _debugLogs.shift();
    _debugListeners.forEach(fn => fn([..._debugLogs]));
  }
};

function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([..._debugLogs]);

  useEffect(() => {
    const handler = (l: string[]) => setLogs(l);
    _debugListeners.push(handler);
    return () => { const i = _debugListeners.indexOf(handler); if (i >= 0) _debugListeners.splice(i, 1); };
  }, []);

  return (
    <>
      {/* Floating trigger button — tap 3× corner dot to open */}
      <TouchableOpacity
        style={dbStyles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={dbStyles.triggerText}>🐛</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={dbStyles.modal}>
          <View style={dbStyles.header}>
            <Text style={dbStyles.headerTitle}>MEDS-DEBUG logs ({logs.length})</Text>
            <TouchableOpacity onPress={() => { _debugLogs.length = 0; setLogs([]); }}>
              <Text style={dbStyles.clearBtn}>Очистить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={dbStyles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={dbStyles.scroll}>
            {logs.length === 0
              ? <Text style={dbStyles.empty}>Нет логов. Открой страницу Лекарства.</Text>
              : [...logs].reverse().map((line, i) => (
                  <Text key={i} style={dbStyles.logLine}>{line}</Text>
                ))
            }
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

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
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    isBiometricEnabled().then(setBiometricEnabledState).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialDeepLink) {
      const path = deepLinkToPath(initialDeepLink);
      if (path) setWebUrl(`${WEB_URL}${path}`);
    }
  }, [initialDeepLink]);

  useEffect(() => {
    // Register push token + notification categories
    registerForPushNotifications().then(async (token) => {
      if (token) {
        setPushToken(token);
        const deviceId = `${Platform.OS}-${Date.now()}`;
        await sendPushTokenToServer(token, deviceId).catch(() => {});
      }
    });
    registerNotificationCategories().catch(() => {});

    // Sync Health Connect data for today (Android only; silently skipped on iOS/unavailable)
    hcSyncToday().catch(() => {});

    // Generic notification tap → navigate WebView (non-medication notifications)
    const navSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const type = (data as Record<string, unknown>).type as string | undefined;
      // Medication actions are handled by addMedicationResponseListener below
      if (type === 'medication') return;
      const url = (data as Record<string, unknown>).url as string | undefined;
      if (url && response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        const path = deepLinkToPath(url);
        if (path) {
          webViewRef.current?.injectJavaScript(
            `window.location.href = ${JSON.stringify(`${WEB_URL}${path}`)}; true;`
          );
        }
      }
    });

    // Medication take/snooze action buttons
    const medSub = addMedicationResponseListener((js) => {
      webViewRef.current?.injectJavaScript(js);
    });

    return () => { navSub.remove(); medSub.remove(); };
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
      window.__AIVITA_BIOMETRIC_ENABLED__ = ${JSON.stringify(biometricEnabled)};

      // Guard prevents duplicate listeners on WebView reload
      if (!window.__AIVITA_SCROLL_ATTACHED__) {
        window.__AIVITA_SCROLL_ATTACHED__ = true;
        window.addEventListener('scroll', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: '__scroll__',
            y: window.scrollY
          }));
        }, { passive: true });
      }

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
        case 'sync-medications': {
          // Web cabinet sends active medication list → re-schedule local notifications
          const meds = msg.data as MedScheduleForNotif[] | undefined;
          console.log('[MEDS-DEBUG] handleMessage sync-medications: received, meds type=', typeof meds, 'isArray=', Array.isArray(meds), 'length=', Array.isArray(meds) ? meds.length : 'n/a');
          if (Array.isArray(meds)) {
            console.log('[MEDS-DEBUG] handleMessage sync-medications: payload=', JSON.stringify(meds.map(m => ({ id: m.id, title: m.title, times: m.times }))));
            await scheduleMedicationReminders(meds).catch((e) => {
              console.log('[MEDS-DEBUG] handleMessage sync-medications: scheduleMedicationReminders ERROR', String(e));
            });
          } else {
            console.log('[MEDS-DEBUG] handleMessage sync-medications: WARNING — meds is not an array, raw data=', JSON.stringify(msg.data));
          }
          break;
        }

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

        case 'sync-health-connect': {
          // WebView запрашивает тихий синк (разрешения уже есть)
          const result = await hcSyncToday().catch((e) => ({ status: 'error' as const, error: String(e) }));
          webViewRef.current?.injectJavaScript(
            `(function(){window.dispatchEvent(new CustomEvent('aivita-health-connect-result',{detail:${JSON.stringify(result)}}));true;})();`
          );
          break;
        }

        case 'check-health-connect': {
          // Веб спрашивает: доступен ли HC на этом устройстве? (без запроса разрешений)
          const status = await checkAvailability().catch(() => 'error' as const);
          webViewRef.current?.injectJavaScript(
            `(function(){window.dispatchEvent(new CustomEvent('aivita-hc-status',{detail:{status:${JSON.stringify(status)}}}));true;})();`
          );
          break;
        }

        case 'request-health-connect': {
          // Пользователь нажал «Подключить» на экране гаджетов — запрашиваем разрешения.
          // ВАЖНО: сначала проверяем доступность — requestPermission() без HC бросает нативный краш.
          const avail = await checkAvailability().catch(() => 'error' as const);
          if (avail !== 'ready') {
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-hc-connected',{detail:{status:${JSON.stringify(avail)}}}));true;})();`
            );
            break;
          }
          const granted = await requestPermissions().catch(() => false);
          if (granted) {
            const syncResult = await hcSyncToday().catch((e) => ({ status: 'error' as const, error: String(e) }));
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-hc-connected',{detail:${JSON.stringify(syncResult)}}));true;})();`
            );
          } else {
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-hc-connected',{detail:{status:'permission_denied'}}));true;})();`
            );
          }
          break;
        }

        case 'enable-biometric': {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled    = await LocalAuthentication.isEnrolledAsync();
          if (!hasHardware || !enrolled) {
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-biometric-status',{detail:{enabled:false,reason:'not_supported'}}));true;})();`
            );
            break;
          }
          const auth = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Подтвердите отпечаток для включения биометрии',
            cancelLabel:   'Отмена',
            fallbackLabel: 'Пароль',
          });
          if (auth.success) {
            await setBiometricEnabled(true);
            setBiometricEnabledState(true);
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-biometric-status',{detail:{enabled:true}}));true;})();`
            );
          } else {
            webViewRef.current?.injectJavaScript(
              `(function(){window.dispatchEvent(new CustomEvent('aivita-biometric-status',{detail:{enabled:false,reason:'cancelled'}}));true;})();`
            );
          }
          break;
        }

        case 'disable-biometric':
          await setBiometricEnabled(false);
          setBiometricEnabledState(false);
          webViewRef.current?.injectJavaScript(
            `(function(){window.dispatchEvent(new CustomEvent('aivita-biometric-status',{detail:{enabled:false}}));true;})();`
          );
          break;

        case 'logout':
          // Clear auth token AND biometric flag — prevents next user from being
          // locked behind previous user's fingerprint after re-login.
          await Promise.all([
            SecureStore.deleteItemAsync('auth_token'),
            setBiometricEnabled(false),
          ]);
          setBiometricEnabledState(false);
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
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      scrollEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          enabled={webViewAtTop}
          tintColor="#c87d8a"
          colors={['#c87d8a']}
        />
      }
    >
      <WebView
        ref={webViewRef}
        source={{ uri: webUrl }}
        style={styles.webview}
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
        // Grant mic/camera permission requests automatically
        mediaCapturePermissionGrantType="grantIfSameHostElseDeny"
        // Disable Android over-scroll glow (web page handles scroll internally)
        overScrollMode="never"
        // Allow nested scrollable web content (chat messages, lists, etc.)
        nestedScrollEnabled
      />
    </ScrollView>
    <DebugPanel />
    </>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scrollContent: { flex: 1 },
  webview:      { flex: 1 },
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

// [MEDS-DEBUG] panel styles — remove with DebugPanel before release
const dbStyles = StyleSheet.create({
  trigger: {
    position: 'absolute', bottom: 80, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  triggerText: { fontSize: 18 },
  modal: { flex: 1, backgroundColor: '#0d0d0d', paddingTop: 48 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#333',
    gap: 8,
  },
  headerTitle: { flex: 1, color: '#0f0', fontSize: 13, fontWeight: '700' },
  clearBtn: { color: '#f90', fontSize: 13, paddingHorizontal: 6 },
  closeBtn: { color: '#f55', fontSize: 18, paddingHorizontal: 6 },
  scroll: { flex: 1, padding: 8 },
  empty: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 32 },
  logLine: {
    color: '#0f0', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 3, lineHeight: 14,
  },
});
