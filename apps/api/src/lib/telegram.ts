import { timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';
import { logger } from './logger.js';

// Public — a bot's @username is visible to anyone who opens a chat with it,
// so this doesn't need to be an env var. Only the token is a secret.
export const TELEGRAM_BOT_USERNAME = 'aivita_uz_bot';

// Telegram echoes the secret_token registered via setWebhook back on every
// webhook call as X-Telegram-Bot-Api-Secret-Token — it's the only thing
// standing between this public endpoint and anyone on the internet who
// finds the URL, so a missing TELEGRAM_WEBHOOK_SECRET fails closed
// (rejects everything) rather than falling back to some open/mock mode.
export function verifyTelegramWebhookSecret(headerValue: string | null | undefined): boolean {
  if (!env.TELEGRAM_WEBHOOK_SECRET || !headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Best-effort: a failed send is logged and swallowed, never thrown — the
// webhook handler that calls this must still answer Telegram 200 quickly
// regardless of whether the reply to the user went out.
export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn('[telegram] sendMessage skipped — TELEGRAM_BOT_TOKEN not set');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, '[telegram] sendMessage вернул ошибку');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, '[telegram] sendMessage упал');
    return false;
  }
}
