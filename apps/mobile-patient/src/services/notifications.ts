import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';
import { getAuthToken } from './auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

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
  return tokenData.data;
}

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
