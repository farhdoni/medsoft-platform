import { Hono } from 'hono';
import { db, telegramLinkTokens } from '@medsoft/db';
import { and, eq, isNull } from 'drizzle-orm';
import { randomBytes, createHash } from 'node:crypto';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { TELEGRAM_BOT_USERNAME } from '../../lib/telegram.js';

export const aivitaTelegramRouter = new Hono();

aivitaTelegramRouter.use('*', requireAivitaAuth);

const TOKEN_TTL_MS = 15 * 60 * 1000;

// POST /v1/aivita/telegram/link — one-time deep link for the user to open
// their bot chat and finish the account link via /start <token> (webhook,
// see routes/telegram/webhook.ts). Any previous unused token for this user
// is invalidated first, so at most one is ever live.
aivitaTelegramRouter.post('/link', async (c) => {
  const userId = c.get('aivitaUserId');

  await db.delete(telegramLinkTokens).where(
    and(eq(telegramLinkTokens.userId, userId), isNull(telegramLinkTokens.usedAt)),
  );

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  await db.insert(telegramLinkTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return c.json({
    data: {
      deepLink: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${rawToken}`,
      expiresInSeconds: TOKEN_TTL_MS / 1000,
    },
  });
});
