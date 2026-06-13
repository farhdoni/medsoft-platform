import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';
import { getAuthToken } from './auth';

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
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'snooze',
      buttonTitle: '⏰ Через 15 мин',
      options: { opensAppToForeground: false },
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

/**
 * Wire up action-button handling for medication reminders.
 * Call once from MainScreen and remove the subscription on unmount.
 */
export function addMedicationResponseListener(
  webViewInject: (js: string) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const data = (notification.request.content.data ?? {}) as {
      scheduleId?: string;
      time?: string;
    };
    const { scheduleId, time } = data;
    if (!scheduleId) return;

    if (
      actionIdentifier === 'take' ||
      actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      void (async () => {
        const token = await getAuthToken().catch(() => null);

        if (token) {
          const ok = await fetch(
            `${API_URL}/v1/aivita/medications/${scheduleId}/take`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ time: time ?? null }),
            }
          ).then(r => r.ok).catch(() => false);

          if (!ok) {
            webViewInject(
              `window.dispatchEvent(new CustomEvent('aivita-med-action',` +
              `{detail:{action:'take',scheduleId:${JSON.stringify(scheduleId)}}}));true;`
            );
          }
        } else {
          webViewInject(
            `window.dispatchEvent(new CustomEvent('aivita-med-action',` +
            `{detail:{action:'take',scheduleId:${JSON.stringify(scheduleId)}}}));true;`
          );
        }
      })();

    } else if (actionIdentifier === 'snooze') {
      const content = notification.request.content;
      void Notifications.scheduleNotificationAsync({
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
    }
  });
}
