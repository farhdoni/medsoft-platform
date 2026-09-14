import { Hono } from 'hono';
import { db, telegramLinkTokens, notificationSettings } from '@medsoft/db';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { verifyTelegramWebhookSecret, sendTelegramMessage } from '../../lib/telegram.js';
import { resolveBotLocale, BOT_MESSAGES } from '../../lib/telegram-i18n.js';
import { logger } from '../../lib/logger.js';

export const telegramWebhookRouter = new Hono();

// "/start" or "/start <token>" — Telegram's deep-link payload
// (t.me/<bot>?start=<token>) arrives as a space-separated second word.
//
// languageCode is from.language_code off the update — the Telegram client's
// language, all we have until a link token resolves an account (see below).
async function handleStart(chatId: number, text: string, languageCode: string | undefined): Promise<void> {
  const token = text.trim().split(/\s+/)[1];

  if (!token) {
    await sendTelegramMessage(chatId, BOT_MESSAGES.greeting[resolveBotLocale(languageCode)]);
    return;
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = new Date();

  // isNull(usedAt) also makes a replayed /start on an already-used token
  // fall straight into the "invalid/expired" reply below — polite, not an
  // error, without needing a second branch to tell "used" from "expired".
  const link = await db.query.telegramLinkTokens.findFirst({
    where: and(
      eq(telegramLinkTokens.tokenHash, tokenHash),
      isNull(telegramLinkTokens.usedAt),
      gt(telegramLinkTokens.expiresAt, now),
    ),
    // Pulled in the same query — every reply from here on knows the
    // account, so its locale (an explicit in-app choice) can outrank the
    // Telegram client language for the rest of this call.
    with: { user: { columns: { locale: true } } },
  });

  if (!link) {
    await sendTelegramMessage(chatId, BOT_MESSAGES.invalidToken[resolveBotLocale(languageCode)]);
    return;
  }

  const locale = resolveBotLocale(languageCode, link.user?.locale);

  // chat.id === from.id for a private bot chat (the only kind /start can
  // arrive from) — stored under chat_id since that's what sendMessage
  // actually takes.
  const chatIdStr = String(chatId);

  try {
    await db.insert(notificationSettings)
      .values({ userId: link.userId, telegramChatId: chatIdStr, telegramEnabled: true })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: { telegramChatId: chatIdStr, telegramEnabled: true, updatedAt: now },
      });
  } catch (err) {
    // notification_settings.telegram_chat_id is UNIQUE — this fires when
    // the chat is already linked to a DIFFERENT user's row (the upsert
    // above only dedupes on user_id, so it can't catch that itself).
    // Deliberate policy: refuse, never silently re-link to the new user —
    // see step-3 report for the alternative considered and why.
    const pgErr = err as { code?: string; constraint_name?: string };
    if (pgErr.code === '23505' && pgErr.constraint_name?.includes('telegram_chat_id')) {
      logger.warn(
        { chatId: chatIdStr, userId: link.userId },
        '[telegram-webhook] chat_id already linked to a different account — refusing',
      );
      await sendTelegramMessage(chatId, BOT_MESSAGES.alreadyLinkedElsewhere[locale]);
      return;
    }
    logger.error({ err, userId: link.userId }, '[telegram-webhook] failed to link telegram account');
    await sendTelegramMessage(chatId, BOT_MESSAGES.linkFailed[locale]);
    return;
  }

  await db.update(telegramLinkTokens)
    .set({ usedAt: now })
    .where(eq(telegramLinkTokens.id, link.id));

  await sendTelegramMessage(chatId, BOT_MESSAGES.linked[locale]);
}

// POST /v1/telegram/webhook — receives updates for @aivita_uz_bot.
//
// Public, no user auth (Telegram calls this directly) — the only gate is
// the secret_token registered via setWebhook, which Telegram echoes back
// on every call as X-Telegram-Bot-Api-Secret-Token. Wrong/missing secret
// is rejected before the body is even parsed.
//
// Step 3: handles /start (with or without a link token) — everything else
// is still accept + log only. Always answers fast: Telegram expects a
// quick 200 and will retry (then eventually disable the webhook) if it
// doesn't get one — the /start work below is a couple of DB round-trips
// plus one Telegram API call, done inline rather than backgrounded, same
// as notifyTelegram() in clinic-requests.ts.
telegramWebhookRouter.post('/', async (c) => {
  const secretHeader = c.req.header('x-telegram-bot-api-secret-token');
  if (!verifyTelegramWebhookSecret(secretHeader)) {
    logger.warn(
      { hasHeader: !!secretHeader },
      '[telegram-webhook] rejected: missing or wrong X-Telegram-Bot-Api-Secret-Token',
    );
    return c.json({ error: 'unauthorized' }, 401);
  }

  const update = await c.req.json().catch(() => null);
  if (!update) {
    logger.warn('[telegram-webhook] secret ok but body was not valid JSON');
    return c.json({ ok: true });
  }

  const type = update.message ? 'message'
    : update.edited_message ? 'edited_message'
    : update.callback_query ? 'callback_query'
    : update.my_chat_member ? 'my_chat_member'
    : 'other';

  const from = update.message?.from ?? update.edited_message?.from ?? update.callback_query?.from;
  const text = update.message?.text ?? update.edited_message?.text;

  // Deliberately only these fields — the raw update can carry contact/
  // location/photo payloads we have no reason to put in logs.
  logger.info(
    { updateId: update.update_id, type, fromId: from?.id, text },
    '[telegram-webhook] update received',
  );

  const chatId = update.message?.chat?.id;
  if (type === 'message' && typeof text === 'string' && text.startsWith('/start') && chatId != null) {
    try {
      await handleStart(chatId, text, from?.language_code);
    } catch (err) {
      // handleStart's own DB/Telegram calls already catch what they can;
      // this is the last-resort net so a bug there never turns into a
      // non-200 response and a Telegram retry storm.
      logger.error({ err }, '[telegram-webhook] handleStart threw unexpectedly');
    }
  }

  return c.json({ ok: true });
});
