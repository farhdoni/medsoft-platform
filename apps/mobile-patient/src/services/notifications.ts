import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';
import { getAuthToken, getSessionToken } from './auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MedScheduleForNotif {
  id: string;
  title: string;
  dosage?: string | null;
  times: string[];              // ["08:00", "20:00"]
  reminderMinutesBefore?: number | null;
}

// ─── Notification handler ─────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Server-side diagnostics ──────────────────────────────────────────────────

/**
 * Fire-and-forget: POST a diagnostic log entry to the server.
 * Entries are stored in Redis (last 50 per user, TTL 7d) and readable via
 * GET /v1/aivita/diag — allowing server-side inspection without USB/Metro.
 */
export async function sendDiagLog(tag: string, payload: unknown): Promise<void> {
  try {
    const token = await getAuthToken().catch(() => null);
    if (!token) return;
    await fetch(`${API_URL}/v1/aivita/diag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tag, payload, ts: Date.now() }),
    });
  } catch {
    // diagnostics must never crash the app
  }
}

// ─── Notification categories (actionable buttons) ────────────────────────────

/** Call once at app start to register the "take / snooze" action buttons. */
export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('medication-reminder', [
    {
      identifier: 'take',
      buttonTitle: '✅ Принял',
      // opensAppToForeground:true — гарантирует доставку экшена даже при убитом
      // приложении: тап запускает приложение, и ответ обрабатывается на старте
      // через getLastNotificationResponseAsync (см. addMedicationResponseListener).
      // При false и killed-state Android не запускает JS — экшен терялся.
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'snooze',
      buttonTitle: '⏰ Через 15 мин',
      options: { opensAppToForeground: true },
    },
  ]);
}

// ─── Permissions + channel setup ─────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  void sendDiagLog('permissions', { existingStatus, finalStatus, platform: Platform.OS });

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c87d8a',
    });
    // Delete legacy channel — Android caches channel config on first creation and
    // ignores subsequent updates (including sound). Renaming to medications-v2 forces
    // a fresh channel with the correct sound file.
    await Notifications.deleteNotificationChannelAsync('medications').catch(() => {});
    await Notifications.setNotificationChannelAsync('medications-v2', {
      name: 'Напоминания о лекарствах',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'aivita_magic_soft_mono',
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#c87d8a',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

// ─── Server token registration ────────────────────────────────────────────────

export async function sendPushTokenToServer(
  pushToken: string,
  deviceId: string
): Promise<void> {
  const authToken = await getAuthToken();
  if (!authToken) return;

  await fetch(`${API_URL}/v1/aivita/devices/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      pushToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceId,
    }),
  });
}

// ─── Local medication reminders ───────────────────────────────────────────────

/**
 * Cancel existing medication reminders and re-schedule them for every active
 * medication in the list.
 *
 * Called:
 *  - On app start (with cached list from AsyncStorage)
 *  - When web sends postMessage({type:'sync-medications', data:[...]})
 *  - When app returns to foreground (AppState 'active')
 */
export async function scheduleMedicationReminders(
  meds: MedScheduleForNotif[],
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const med of meds) {
    const times: string[] = Array.isArray(med.times) ? med.times : [];
    const minutesBefore = Math.max(0, med.reminderMinutesBefore ?? 5);

    for (const timeStr of times) {
      const [hStr, mStr] = timeStr.split(':');
      let hour = parseInt(hStr, 10);
      let minute = parseInt(mStr, 10) - minutesBefore;

      if (minute < 0) {
        minute += 60;
        hour = hour === 0 ? 23 : hour - 1;
      }

      const content: Notifications.NotificationContentInput = {
        title: `💊 ${med.title}`,
        body: [med.dosage, `Время принять в ${timeStr}`].filter(Boolean).join(' · '),
        sound: 'aivita_magic_soft_mono',
        categoryIdentifier: 'medication-reminder',
        data: { scheduleId: med.id, time: timeStr, type: 'medication' },
      };

      if (Platform.OS === 'android') {
        (content as Record<string, unknown>).android = { channelId: 'medications-v2' };
      }

      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
  }

  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  void sendDiagLog('scheduled', {
    medsCount: meds.length,
    medsIds: meds.map(m => m.id),
    scheduledCount: allScheduled.length,
    scheduled: allScheduled.map(n => {
      const t = n.trigger as Record<string, unknown>;
      return { title: n.content.title, h: t.hour, m: t.minute };
    }),
  });
}

// ─── Notification response handler (take / snooze) ────────────────────────────

// De-dupe the SAME action tap when it arrives both via cold-start
// (getLastNotificationResponseAsync) and the live listener. POST /:id/take
// decrements remaining pills on every call, so it must not be processed twice.
const handledResponses = new Map<string, number>();
function alreadyHandled(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of handledResponses) {
    if (now - ts > 30_000) handledResponses.delete(k);
  }
  if (handledResponses.has(key)) return true;
  handledResponses.set(key, now);
  return false;
}

/**
 * Handle a medication action tap (take / snooze). Runs headless — does NOT depend
 * on a live WebView: the dose is marked on the server with the WebView session
 * cookie (X-Aivita-Session), so it works from background and cold start.
 */
async function handleMedicationResponse(
  response: Notifications.NotificationResponse,
  webViewInject: (js: string) => void,
): Promise<void> {
  const { actionIdentifier, notification } = response;
  const content = notification.request.content;
  const data = (content.data ?? {}) as { scheduleId?: string; time?: string };
  const { scheduleId, time } = data;
  if (!scheduleId) return; // not a medication reminder

  const notifId = notification.request.identifier;
  if (alreadyHandled(`${notifId}:${actionIdentifier}`)) return;

  if (actionIdentifier === 'snooze') {
    // Remove the current reminder and re-fire it in 15 minutes.
    await Notifications.dismissNotificationAsync(notifId).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title ?? '💊 Напоминание',
        body: content.body ?? 'Не забудьте принять лекарство',
        sound: 'aivita_magic_soft_mono',
        categoryIdentifier: 'medication-reminder',
        data: content.data ?? {},
        ...(Platform.OS === 'android'
          ? ({ android: { channelId: 'medications-v2' } } as Record<string, unknown>)
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 15 * 60 * 1000),
      },
    }).catch(() => {});
    return;
  }

  if (
    actionIdentifier === 'take' ||
    actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    // Auth from background = WebView session cookie via X-Aivita-Session (same path
    // as the Health Connect batch). The API does NOT read Authorization: Bearer,
    // so the old `Bearer web_session` always 401'd and the dose was never marked.
    const token = await getSessionToken().catch(() => null);
    let synced = false;
    if (token) {
      synced = await fetch(`${API_URL}/v1/aivita/medications/${scheduleId}/take`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Aivita-Session': token },
        body: JSON.stringify({ time: time ?? null }),
      }).then((r) => r.ok).catch(() => false);
    }
    // Dismiss the delivered reminder regardless of sync outcome.
    await Notifications.dismissNotificationAsync(notifId).catch(() => {});
    // Best-effort: refresh adherence in the cabinet if the WebView is mounted.
    // If the server sync failed (no session), the web marks it on next open.
    webViewInject(
      `window.dispatchEvent(new CustomEvent('aivita-med-action',` +
      `{detail:{action:'take',scheduleId:${JSON.stringify(scheduleId)},synced:${synced}}}));true;`
    );
  }
}

/**
 * Wire up action-button handling for medication reminders.
 * Call once from MainScreen and remove the subscription on unmount.
 */
export function addMedicationResponseListener(
  webViewInject: (js: string) => void,
): Notifications.EventSubscription {
  // Cold start: process the action tap that launched the app from a killed state.
  // getLastNotificationResponseAsync returns the launching response once.
  Notifications.getLastNotificationResponseAsync()
    .then((resp) => { if (resp) void handleMedicationResponse(resp, webViewInject); })
    .catch(() => {});

  // Foreground / background-alive taps.
  return Notifications.addNotificationResponseReceivedListener((response) => {
    void handleMedicationResponse(response, webViewInject);
  });
}
