import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { notifications } from '@medsoft/db';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaNotificationsRouter = new Hono();

aivitaNotificationsRouter.use('*', requireAivitaAuth);

// ─── List notifications ────────────────────────────────────────────────────────
aivitaNotificationsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const limit = Math.min(Number(c.req.query('limit') ?? 30), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const rows = await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const unreadCount = rows.filter((n) => !n.readAt).length;

  return c.json({ data: rows, unreadCount });
});

// ─── Mark single as read ───────────────────────────────────────────────────────
aivitaNotificationsRouter.patch('/:id/read', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();

  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

  return c.json({ data: { read: true } });
});

// ─── Mark all as read ──────────────────────────────────────────────────────────
aivitaNotificationsRouter.post('/read-all', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return c.json({ data: { success: true } });
});

// ─── Create notification ───────────────────────────────────────────────────────
aivitaNotificationsRouter.post(
  '/',
  zValidator('json', z.object({
    type: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    payload: z.object({
      screen: z.string().optional(),
      params: z.record(z.unknown()).optional(),
    }).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [created] = await db.insert(notifications).values({
      userId,
      type: body.type,
      title: body.title,
      body: body.body,
      payload: body.payload,
    }).returning();

    return c.json({ data: created }, 201);
  }
);

// ─── Delete notification ───────────────────────────────────────────────────────
aivitaNotificationsRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return c.json({ data: { deleted: true } });
});
