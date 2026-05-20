import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';
import { getToken } from './auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'AIVITA Doctor',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6BA3D6',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenData.data;
}

export async function sendPushToken(): Promise<void> {
  try {
    const pushToken = await registerForPushNotifications();
    if (!pushToken) return;

    const authToken = await getToken();
    if (!authToken) return;

    await fetch(`${API_URL}/v1/aivita/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aivita-Session': authToken,
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS,
        role: 'doctor',
      }),
    });
  } catch {}
}
