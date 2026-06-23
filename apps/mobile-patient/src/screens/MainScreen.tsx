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
  AppState,
  AppStateStatus,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { WEB_URL } from '../constants/config';
import { isBiometricEnabled, setBiometricEnabled, getSessionToken } from '../services/auth';
import {
  registerForPushNotifications,
  sendPushTokenToServer,
  scheduleMedicationReminders,
  registerNotificationCategories,
  addMedicationResponseListener,
  sendDiagLog,
  type MedScheduleForNotif,
} from '../services/notifications';
import { syncToday as hcSyncToday, requestPermissions, checkAvailability, hasHcPermissions } from '../services/healthConnect';
import { takePhoto, pickFromGallery } from '../services/camera';
import type { Screen } from '../../App';

const { height: _SCREEN_HEIGHT } = Dimensions.get('window');

const MEDS_CACHE_KEY = 'aivita:meds-cache';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deepLinkToPath(url: string): string | null {
  try {
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

/** Request POST_NOTIFICATIONS permission on Android 13+ (API 33+). */
async function requestAndroid13NotifPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // @ts-ignore — POST_NOTIFICATIONS added in RN 0.71 / API 33
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS ?? 'android.permission.POST_NOTIFICATIONS',
    );
    void sendDiagLog('android13-notif-perm', { granted });
  } catch {
    // Older Android — permission doesn't exist, silently skip
  }
}

/**
 * Request battery optimisation exclusion via the standard Android dialog
 * (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS). Works on all OEMs including
 * Samsung One UI and MIUI. Shown only once per install.
 */
async function maybeRequestBatteryOptimizationExclusion(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const key = 'aivita:battery-opt-requested';
  const done = await AsyncStorage.getItem(key).catch(() => null);
  if (done) return;
  await AsyncStorage.setItem(key, '1').catch(() => {});

  try {
    // Standard AOSP intent — opens "Allow app to always run in background?" dialog.
    // Works on Samsung One UI, stock Android, and other OEMs.
    // Requires REQUEST_IGNORE_BATTERY_OPTIMIZATIONS in AndroidManifest.xml.
    await Linking.sendIntent(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      [{ key: 'android.provider.extra.PACKAGE_NAME', value: 'uz.aivita.app' }],
    );
    void sendDiagLog('battery-opt-requested', { ok: true });
  } catch {
    // Device blocked the intent — fall back to manual instructions
    void sendDiagLog('battery-opt-requested', { ok: false, fallback: true });
    Alert.alert(
      'Разрешите фоновую работу',
      'Чтобы напоминания о лекарствах приходили вовремя:\n\n' +
      'Настройки → Приложения → AIVITA → Батарея → Без ограничений',
      [
        { text: 'Открыть настройки', onPress: () => Linking.openSettings() },
        { text: 'Позже', style: 'cancel' },
      ],
    );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  onNavigate: (screen: Screen) => void;
  initialDeepLink?: string | null;
};

export function MainScreen({ onNavigate, initialDeepLink }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [webUrl, setWebUrl] = useState(`${WEB_URL}/ru/home`);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webViewAtTop, setWebViewAtTop] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  // Mutex: prevents concurrent scheduleMedicationReminders calls from racing
  const schedLockRef = useRef(false);

  // ── Biometric state ────────────────────────────────────────────────────────
  useEffect(() => {
    isBiometricEnabled().then(setBiometricEnabledState).catch(() => {});
  }, []);

  // ── Geolocation permission (Android) ───────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).catch(() => {});
    }
  }, []);

  // ── Deep-link navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (initialDeepLink) {
      const path = deepLinkToPath(initialDeepLink);
      if (path) setWebUrl(`${WEB_URL}${path}`);
    }
  }, [initialDeepLink]);

  // ── Push + categories + MIUI battery guide ─────────────────────────────────
  useEffect(() => {
    // Android 13+: runtime POST_NOTIFICATIONS permission
    void requestAndroid13NotifPermission();

    registerNotificationCategories().catch(() => {});

    // Request battery optimisation exclusion via system dialog (Samsung + all Android)
    void maybeRequestBatteryOptimizationExclusion();

    // Defer push token registration until the WebView session cookie is available.
    // On cold start the WebView hasn't loaded yet, so getSessionToken() returns null
    // and sendPushTokenToServer silently exits. Poll every 2 s, give up after 30 s.
    let pushCancelled = false;
    let pushAttempt = 0;
    const tryRegisterPush = async (): Promise<void> => {
      if (pushCancelled) return;
      const session = await getSessionToken().catch(() => null);
      if (!session) {
        if (++pushAttempt < 15) setTimeout(() => void tryRegisterPush(), 2000);
        return;
      }
      registerForPushNotifications()
        .then(async (token) => {
          if (token && !pushCancelled) {
            setPushToken(token);
            const deviceId = `${Platform.OS}-${Date.now()}`;
            await sendPushTokenToServer(token, deviceId).catch(() => {});
          }
        })
        .catch((e: unknown) => void sendDiagLog('push-flow-error', { error: String(e) }));
    };
    void tryRegisterPush();

    // Schedule from cached list immediately (covers kill-and-relaunch case)
    AsyncStorage.getItem(MEDS_CACHE_KEY).then(raw => {
      if (!raw) return;
      const meds = JSON.parse(raw) as MedScheduleForNotif[];
      if (Array.isArray(meds) && meds.length > 0 && !schedLockRef.current) {
        schedLockRef.current = true;
        scheduleMedicationReminders(meds).catch(() => {}).finally(() => { schedLockRef.current = false; });
      }
    }).catch(() => {});

    // Sync Health Connect data for today
    hcSyncToday().catch(() => {});

    // Generic notification tap → navigate WebView (non-medication)
    const navSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const type = (data as Record<string, unknown>).type as string | undefined;
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

    return () => { pushCancelled = true; navSub.remove(); medSub.remove(); };
  }, []);

  // ── AppState: reschedule on foreground (Samsung/MIUI may cancel scheduled alarms) ──
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      AsyncStorage.getItem(MEDS_CACHE_KEY).then(raw => {
        if (!raw) return;
        const meds = JSON.parse(raw) as MedScheduleForNotif[];
        if (Array.isArray(meds) && meds.length > 0 && !schedLockRef.current) {
          schedLockRef.current = true;
          scheduleMedicationReminders(meds).catch(() => {}).finally(() => { schedLockRef.current = false; });
        }
      }).catch(() => {});

      // Re-emit HC "connected" on foreground. After the system HC permission dialog
      // the one-shot inject right after requestPermissions can be missed, leaving the
      // card on «Подключить». If HC is available and granted, re-dispatch so the web
      // restores + persists the connected state (ignored if not on the gadgets page).
      void (async () => {
        const avail = await checkAvailability().catch(() => 'error' as const);
        if (avail !== 'ready') return;
        const granted = await hasHcPermissions().catch(() => false);
        if (!granted) return;
        webViewRef.current?.injectJavaScript(
          `(function(){window.dispatchEvent(new CustomEvent('aivita-hc-connected',{detail:{status:'ready'}}));true;})();`
        );
      })();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  // ── Re-inject push token into WebView when it becomes available ────────────
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
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'sync-medications': {
          const meds = msg.data as MedScheduleForNotif[] | undefined;
          void sendDiagLog('sync-received', {
            isArray: Array.isArray(meds),
            length: Array.isArray(meds) ? meds.length : null,
          });
          if (Array.isArray(meds)) {
            AsyncStorage.setItem(MEDS_CACHE_KEY, JSON.stringify(meds)).catch(() => {});
            if (!schedLockRef.current) {
              schedLockRef.current = true;
              await scheduleMedicationReminders(meds).catch(() => {}).finally(() => { schedLockRef.current = false; });
            }
          }
          break;
        }

        case '__scroll__':
          // <= 1 (not strict 0): residual/sub-pixel scrollY at the visual top must
          // still count as "at top", otherwise pull-to-refresh stays gated off.
          setWebViewAtTop((msg.y as number) <= 1);
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
          const result = await hcSyncToday().catch((e) => ({ status: 'error' as const, error: String(e) }));
          webViewRef.current?.injectJavaScript(
            `(function(){window.dispatchEvent(new CustomEvent('aivita-health-connect-result',{detail:${JSON.stringify(result)}}));true;})();`
          );
          break;
        }

        case 'check-health-connect': {
          const status = await checkAvailability().catch(() => 'error' as const);
          // Check actual Android grants only when SDK is confirmed ready — calling
          // getGrantedPermissions() on unavailable HC causes a native crash.
          const connected = status === 'ready' ? await hasHcPermissions().catch(() => false) : false;
          webViewRef.current?.injectJavaScript(
            `(function(){window.dispatchEvent(new CustomEvent('aivita-hc-status',{detail:{status:${JSON.stringify(status)},connected:${connected}}}));true;})();`
          );
          break;
        }

        case 'request-health-connect': {
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
    // Pull-to-refresh: re-read Health Connect and re-POST the batch FIRST so the
    // gadget's fresh data lands in the DB, THEN reload so the web refetches it.
    hcSyncToday()
      .catch(() => {})
      .finally(() => { webViewRef.current?.reload(); });
  }, []);

  const handleLoadEnd = useCallback(() => {
    setRefreshing(false);
    setIsOffline(false);
    // A full load/reload always lands at the top — re-arm the pull-to-refresh gate
    // so it doesn't stay stuck disabled from a previous page's scroll position.
    setWebViewAtTop(true);
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
          geolocationEnabled={true}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grantIfSameHostElseDeny"
          overScrollMode="never"
          nestedScrollEnabled
        />
      </ScrollView>
    </View>
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
