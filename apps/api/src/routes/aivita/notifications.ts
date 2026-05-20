import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { notifications, notificationSettings } from '@medsoft/db';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaNotificationsRouter = new Hono();

aivitaNotificationsRouter.use('*', requireAivitaAuth);

// ─── GET / ─────────────────────────────────────────────────────────────────────
aivitaNotificationsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const limit = Math.min(Number(c.req.query('limit') ?? 30), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const rows = await db.select().from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isArchived, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// ─── GET /unread-count ─────────────────────────────────────────────────────────
aivitaNotificationsRouter.get('/unread-count', async (c) => {
  const userId = c.get('aivitaUserId');
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
      eq(notifications.isArchived, false),
    ));
  return c.json({ count: count ?? 0 });
});

// ─── GET /settings ─────────────────────────────────────────────────────────────
aivitaNotificationsRouter.get('/settings', async (c) => {
  const userId = c.get('aivitaUserId');
  const [settings] = await db.select().from(notificationSettings)
    .where(eq(notificationSettings.userId, userId)).limit(1);

  if (!settings) {
    return c.json({
      data: {
        emailEnabled: true,
        telegramEnabled: false,
        telegramChatId: null,
        medicationReminders: true,
        appointmentReminders: true,
        outbreakAlerts: true,
        marketingEnabled: false,
      },
    });
  }
  return c.json({ data: settings });
});

// ─── PUT /settings ─────────────────────────────────────────────────────────────
aivitaNotificationsRouter.put(
  '/settings',
  zValidator('json', z.object({
    emailEnabled:          z.boolean().optional(),
    telegramEnabled:       z.boolean().optional(),
    telegramChatId:        z.string().nullable().optional(),
    medicationReminders:   z.boolean().optional(),
    appointmentReminders:  z.boolean().optional(),
    outbreakAlerts:        z.boolean().optional(),
    marketingEnabled:      z.boolean().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [existing] = await db.select({ id: notificationSettings.id })
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId)).limit(1);

    if (existing) {
      const [updated] = await db.update(notificationSettings)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(notificationSettings.userId, userId))
        .returning();
      return c.json({ data: updated });
    }

    const [created] = await db.insert(notificationSettings)
      .values({ userId, ...body })
      .returning();
    return c.json({ data: created }, 201);
  }
);

// ─── PUT /:id/read ─────────────────────────────────────────────────────────────
aivitaNotificationsRouter.put('/:id/read', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return c.json({ data: { read: true } });
});

// ─── PATCH /:id/read (legacy alias) ───────────────────────────────────────────
aivitaNotificationsRouter.patch('/:id/read', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return c.json({ data: { read: true } });
});

// ─── PUT /read-all ─────────────────────────────────────────────────────────────
aivitaNotificationsRouter.put('/read-all', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
    ));
  return c.json({ data: { success: true } });
});

// ─── POST /read-all (legacy alias) ────────────────────────────────────────────
aivitaNotificationsRouter.post('/read-all', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
      isNull(notifications.readAt),
    ));
  return c.json({ data: { success: true } });
});

// ─── DELETE /:id ───────────────────────────────────────────────────────────────
aivitaNotificationsRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return c.json({ data: { deleted: true } });
});
