import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { aivitaUsers } from '@medsoft/db';
import { eq, isNull } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaUsersRouter = new Hono();

aivitaUsersRouter.use('*', requireAivitaAuth);

// ─── Get profile ───────────────────────────────────────────────────────────────
aivitaUsersRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const user = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.id, userId),
  });
  if (!user || user.deletedAt) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: user });
});

// ─── Update profile ────────────────────────────────────────────────────────────
aivitaUsersRouter.patch(
  '/',
  zValidator('json', z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    locale: z.enum(['ru', 'uz', 'en']).optional(),
    preferences: z.object({
      notifications: z.object({ push: z.boolean(), email: z.boolean() }).optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      units: z.object({
        weight: z.enum(['kg', 'lb']),
        height: z.enum(['cm', 'ft']),
      }).optional(),
    }).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [updated] = await db.update(aivitaUsers)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(aivitaUsers.id, userId))
      .returning();

    return c.json({ data: updated });
  }
);

// ─── Delete account (soft) ─────────────────────────────────────────────────────
aivitaUsersRouter.delete('/', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.update(aivitaUsers)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(aivitaUsers.id, userId));
  return c.json({ data: { deleted: true } });
});
