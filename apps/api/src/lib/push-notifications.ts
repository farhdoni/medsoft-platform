/**
 * Push notification sender.
 *
 * Routes by token type:
 *  - Expo push tokens (ExponentPushToken[...]) → Expo Push API
 *  - Web push subscriptions (JSON with {endpoint, keys}) → VAPID / web-push
 */

// web-push is an optional dependency — load lazily so the API starts even
// if the package is not yet installed in the container (e.g. stale Docker layer).
import { db } from '@medsoft/db';
import { aivitaDeviceTokens } from '@medsoft/db';
import { eq } from 'drizzle-orm';

// ─── VAPID setup (lazy) ───────────────────────────────────────────────────────

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? 'mailto:support@aivita.uz';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _webPush: any = null;

async function getWebPush() {
  if (_webPush) return _webPush;
  try {
    // Dynamic import — safe even if web-push is not installed
    _webPush = (await import('web-push')).default;
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      _webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    }
  } catch {
    console.warn('[Push] web-push module not available — web push notifications disabled');
    _webPush = null;
  }
  return _webPush;
}

// ─── Expo push ────────────────────────────────────────────────────────────────

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
    console.error('[Push] Failed to send Expo notifications:', err);
  }
}

// ─── Web push (VAPID) ─────────────────────────────────────────────────────────

/**
 * Send a Web Push notification to a single subscription.
 * Handles stale subscriptions (410 Gone / 404 Not Found) by removing them
 * from the database to prevent future failed sends.
 *
 * @param subscriptionJson  JSON-stringified PushSubscription
 *                          ({endpoint, keys:{p256dh, auth}})
 */
export async function sendWebPushNotification(
  subscriptionJson: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const wp = await getWebPush();
  if (!wp) {
    console.warn('[WebPush] Skipping — web-push not available');
    return;
  }

  let sub: { endpoint: string; keys: { p256dh: string; auth: string } };
  try {
    sub = JSON.parse(subscriptionJson);
  } catch {
    console.error('[WebPush] Invalid subscription JSON:', subscriptionJson.slice(0, 80));
    return;
  }

  const payload = JSON.stringify({ title, body, data });

  try {
    await wp.sendNotification(sub, payload);
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 410 || e.statusCode === 404) {
      // Subscription expired or unsubscribed — remove from DB
      console.info('[WebPush] Removing stale subscription:', sub.endpoint.slice(0, 60));
      await db
        .delete(aivitaDeviceTokens)
        .where(eq(aivitaDeviceTokens.pushToken, subscriptionJson))
        .catch((dbErr) => console.error('[WebPush] Failed to remove stale sub:', dbErr));
    } else {
      console.error('[WebPush] Send failed:', err);
    }
  }
}

// ─── Mixed routing ────────────────────────────────────────────────────────────

export type TokenWithPlatform = { pushToken: string; platform: string };

/**
 * Send to a mixed list of tokens, routing by platform:
 *  - ios / android  → Expo push API
 *  - web            → VAPID web-push
 */
export async function sendToTokensWithPlatform(
  tokens: TokenWithPlatform[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const expoTokens = tokens.filter(t => t.platform !== 'web').map(t => t.pushToken);
  const webSubs    = tokens.filter(t => t.platform === 'web');

  await Promise.all([
    sendPushNotification(expoTokens, title, body, data),
    ...webSubs.map(t => sendWebPushNotification(t.pushToken, title, body, data)),
  ]);
}

// ─── Per-user helper ──────────────────────────────────────────────────────────

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

// ─── Internal helpers ─────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
