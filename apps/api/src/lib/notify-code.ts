import { db, notificationSettings } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { sendTelegramMessage } from './telegram.js';
import { logger } from './logger.js';

export type AuthNotifyResult = { channel: 'telegram' | 'email'; fallback: boolean };

// Channel dispatcher for AIVITA auth codes/links (verification codes,
// password reset) — scoped deliberately to just those, not push
// notifications or reminders (those have their own delivery paths).
//
// Telegram is only used when the user has actually linked it
// (notification_settings.telegramEnabled + telegramChatId — see step 3).
// A brand-new registering user has no notification_settings row yet, so
// this naturally falls through to email without any special-casing at the
// call site.
//
// Reliability: a Telegram send failure (bot blocked, API down — anything
// sendTelegramMessage itself already caught and turned into `false`) is
// NOT the end of the story — it falls back to `sendEmail`, because losing
// a verification code or reset link is worse than sending it twice.
export async function sendAuthMessage(
  userId: string,
  telegramText: string,
  sendEmail: () => Promise<void>,
): Promise<AuthNotifyResult> {
  const settings = await db.query.notificationSettings.findFirst({
    where: eq(notificationSettings.userId, userId),
  });

  if (!settings?.telegramEnabled || !settings.telegramChatId) {
    await sendEmail();
    return { channel: 'email', fallback: false };
  }

  const sent = await sendTelegramMessage(settings.telegramChatId, telegramText);
  if (sent) {
    return { channel: 'telegram', fallback: false };
  }

  logger.warn({ userId }, '[notify-code] Telegram send failed — falling back to email');
  await sendEmail();
  return { channel: 'email', fallback: true };
}
