import { timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';

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
