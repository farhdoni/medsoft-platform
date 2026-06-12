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
  console.log('[MEDS-DEBUG] registerForPushNotifications: start, isDevice=', Device.isDevice);
  if (!Device.isDevice) {
    console.log('[MEDS-DEBUG] registerForPushNotifications: NOT a real device — skipping');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  console.log('[MEDS-DEBUG] registerForPushNotifications: existingStatus=', existingStatus);

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[MEDS-DEBUG] registerForPushNotifications: after request, status=', status);
  }

  console.log('[MEDS-DEBUG] registerForPushNotifications: finalStatus=', finalStatus);
  if (finalStatus !== 'granted') {
    console.log('[MEDS-DEBUG] registerForPushNotifications: PERMISSION DENIED — notifications will NOT work');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c87d8a',
    });
    // Dedicated channel for medication reminders — brand sound + high importance
    await Notifications.setNotificationChannelAsync('medications', {
      name: 'Напоминания о лекарствах',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'aivita_magic_soft_mono',  // filename without extension (from assets/sounds)
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#c87d8a',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  console.log('[MEDS-DEBUG] registerForPushNotifications: pushToken=', tokenData.data?.slice(0, 20), '...');
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
 *  - On app start (after push permissions granted)
 *  - Whenever the web sends postMessage({type:'sync-medications', data:[...]})
 *
 * TODO: expo-notifications currently has no API to cancel only a specific
 * category. Once https://github.com/expo/expo/issues/XXXX is resolved, replace
 * cancelAllScheduledNotificationsAsync() with a category-scoped cancel so that
 * non-medication reminders (e.g. health checkup) are preserved.
 * Workaround: store scheduled IDs in AsyncStorage keyed by 'med-notif-ids'
 * and cancel them individually — implement when needed.
 */
export async function scheduleMedicationReminders(
  meds: MedScheduleForNotif[],
): Promise<void> {
  console.log('[MEDS-DEBUG] scheduleMedicationReminders: called with', meds.length, 'meds');
  meds.forEach((m, i) => {
    console.log(`[MEDS-DEBUG]   med[${i}]: id=${m.id} title="${m.title}" times=${JSON.stringify(m.times)} reminderMin=${m.reminderMinutesBefore}`);
  });

  // Cancel all previously scheduled notifications
  // (see TODO above for a future targeted cancel)
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[MEDS-DEBUG] scheduleMedicationReminders: cancelled all existing notifications');

  for (const med of meds) {
    const times: string[] = Array.isArray(med.times) ? med.times : [];
    const minutesBefore = Math.max(0, med.reminderMinutesBefore ?? 5);

    for (const timeStr of times) {
      const [hStr, mStr] = timeStr.split(':');
      let hour = parseInt(hStr, 10);
      let minute = parseInt(mStr, 10) - minutesBefore;

      // Wrap negative minutes into the previous hour
      if (minute < 0) {
        minute += 60;
        hour = hour === 0 ? 23 : hour - 1;
      }

      const content: Notifications.NotificationContentInput = {
        title: `💊 ${med.title}`,
        body: [med.dosage, `Время принять в ${timeStr}`].filter(Boolean).join(' · '),
        sound: 'aivita_magic_soft_mono',     // iOS: filename without extension in bundle
        categoryIdentifier: 'medication-reminder',
        data: { scheduleId: med.id, time: timeStr, type: 'medication' },
      };

      // Android: attach channelId via the android-specific field
      if (Platform.OS === 'android') {
        (content as Record<string, unknown>).android = { channelId: 'medications' };
      }

      console.log(`[MEDS-DEBUG]   scheduling "${med.title}" originalTime=${timeStr} -> notifAt=${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} (minus ${minutesBefore}min)`);
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

  // Summary: how many notifications are now scheduled?
  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log('[MEDS-DEBUG] scheduleMedicationReminders: DONE — total scheduled notifications now:', allScheduled.length);
  allScheduled.forEach((n, i) => {
    const t = n.trigger as Record<string, unknown>;
    console.log(`[MEDS-DEBUG]   scheduled[${i}]: "${n.content.title}" h=${t.hour} m=${t.minute}`);
  });
}

// ─── Notification response handler (take / snooze) ────────────────────────────

/**
 * Wire up action-button handling for medication reminders.
 * Call once from MainScreen and remove the subscription on unmount.
 *
 * FIX (getAuthToken): getAuthToken() is ASYNC and reads from SecureStore.
 * In a notification response (app in background or just launched), it MAY
 * return null if the session is not cached. Strategy:
 *  1. Try direct Bearer fetch — works when SecureStore is available.
 *  2. If token is null OR fetch fails → inject action into WebView so the
 *     web app (which has the session cookie) handles the API call.
 *
 * @param webViewInject  function to inject JS into the active WebView
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
      // Try native Bearer fetch, fall back to WebView dispatch
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
            // Fetch failed — tell WebView to handle it
            webViewInject(
              `window.dispatchEvent(new CustomEvent('aivita-med-action',` +
              `{detail:{action:'take',scheduleId:${JSON.stringify(scheduleId)}}}));true;`
            );
          }
        } else {
          // No token cached — WebView must handle it
          webViewInject(
            `window.dispatchEvent(new CustomEvent('aivita-med-action',` +
            `{detail:{action:'take',scheduleId:${JSON.stringify(scheduleId)}}}));true;`
          );
        }
      })();

    } else if (actionIdentifier === 'snooze') {
      // One-shot notification in 15 min — no auth needed
      const content = notification.request.content;
      void Notifications.scheduleNotificationAsync({
        content: {
          title: content.title ?? '💊 Напоминание',
          body: content.body ?? 'Не забудьте принять лекарство',
          sound: 'aivita_magic_soft_mono',
          categoryIdentifier: 'medication-reminder',
          data: content.data ?? {},
          ...(Platform.OS === 'android'
            ? ({ android: { channelId: 'medications' } } as Record<string, unknown>)
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
