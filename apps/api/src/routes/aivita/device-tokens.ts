import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { aivitaDeviceTokens } from '@medsoft/db';
import { eq, and } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaDeviceTokensRouter = new Hono();

aivitaDeviceTokensRouter.use('*', requireAivitaAuth);

// ─── Register device token ─────────────────────────────────────────────────────

aivitaDeviceTokensRouter.post(
  '/',
  zValidator('json', z.object({
    pushToken: z.string().min(1),
    platform: z.enum(['android', 'ios']).default('android'),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { pushToken, platform } = c.req.valid('json');

    // Upsert: if token already registered, update userId (device changed owner)
    await db.insert(aivitaDeviceTokens)
      .values({ userId, pushToken, platform })
      .onConflictDoUpdate({
        target: aivitaDeviceTokens.pushToken,
        set: { userId, platform, updatedAt: new Date() },
      });

    return c.json({ data: { registered: true } });
  }
);

// ─── Unregister device token ───────────────────────────────────────────────────

aivitaDeviceTokensRouter.delete(
  '/',
  zValidator('json', z.object({ pushToken: z.string().min(1) })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { pushToken } = c.req.valid('json');

    await db.delete(aivitaDeviceTokens)
      .where(and(
        eq(aivitaDeviceTokens.userId, userId),
        eq(aivitaDeviceTokens.pushToken, pushToken),
      ));

    return c.json({ data: { unregistered: true } });
  }
);

// ─── List tokens for user (internal) ──────────────────────────────────────────

export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  const tokens = await db.select({ pushToken: aivitaDeviceTokens.pushToken })
    .from(aivitaDeviceTokens)
    .where(eq(aivitaDeviceTokens.userId, userId));
  return tokens.map((t) => t.pushToken);
}
