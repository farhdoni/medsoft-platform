/**
 * Push notification sender using Expo's push notification API.
 * Sends to expo push tokens stored in aivita_device_tokens.
 */

type ExpoMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
};

type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (tokens.length === 0) return;

  const messages: ExpoMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default',
    data,
  }));

  try {
    // Expo supports up to 100 messages per request
    const chunks = chunkArray(messages, 100);
    for (const chunk of chunks) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        console.error('[Push] Expo API error:', res.status, await res.text());
        continue;
      }

      const result = await res.json() as { data: ExpoTicket[] };
      for (const ticket of result.data) {
        if (ticket.status === 'error') {
          console.error('[Push] Ticket error:', ticket.message, ticket.details);
        }
      }
    }
  } catch (err) {
    console.error('[Push] Failed to send notifications:', err);
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Send push to a specific user by userId.
 * Looks up their registered device tokens from the DB.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const { getUserDeviceTokens } = await import('../routes/aivita/device-tokens.js');
  const tokens = await getUserDeviceTokens(userId);
  await sendPushNotification(tokens, title, body, data);
}
