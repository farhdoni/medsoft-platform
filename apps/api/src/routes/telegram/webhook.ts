import { Hono } from 'hono';
import { verifyTelegramWebhookSecret } from '../../lib/telegram.js';
import { logger } from '../../lib/logger.js';

export const telegramWebhookRouter = new Hono();

// POST /v1/telegram/webhook — receives updates for @aivita_uz_bot.
//
// Public, no user auth (Telegram calls this directly) — the only gate is
// the secret_token registered via setWebhook, which Telegram echoes back
// on every call as X-Telegram-Bot-Api-Secret-Token. Wrong/missing secret
// is rejected before the body is even parsed.
//
// Step 2 (this file): accept + log only, so we can confirm updates are
// actually arriving and see their shape. No /start handling, no DB write —
// account linking against notification_settings.telegram_chat_id is step 3.
// Always answers fast: Telegram expects a quick 200 and will retry (then
// eventually disable the webhook) if it doesn't get one.
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

  return c.json({ ok: true });
});
