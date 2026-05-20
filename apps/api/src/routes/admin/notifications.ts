import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { notifications, aivitaUsers } from '@medsoft/db';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth.js';
import { createBroadcastNotifications } from '../../lib/notification-service.js';

export const adminNotificationsRouter = new Hono();

adminNotificationsRouter.use('*', requireAuth);

// ─── POST /broadcast ──────────────────────────────────────────────────────────
adminNotificationsRouter.post(
  '/broadcast',
  zValidator('json', z.object({
    audience: z.enum(['all', 'patients', 'doctors']),
    title:    z.string().min(1).max(200),
    body:     z.string().min(1),
    link:     z.string().max(300).optional(),
  })),
  async (c) => {
    const { audience, title, body, link } = c.req.valid('json');

    const whereClause =
      audience === 'patients' ? eq(aivitaUsers.role, 'patient') :
      audience === 'doctors'  ? eq(aivitaUsers.role, 'doctor')  :
      undefined;

    const query = db.select({ id: aivitaUsers.id }).from(aivitaUsers);
    const users = whereClause
      ? await query.where(whereClause)
      : await query;

    const userIds = users.map((u) => u.id);
    await createBroadcastNotifications(userIds, title, body, { link });

    return c.json({ data: { sent: userIds.length } }, 201);
  }
);

// ─── GET /broadcasts ──────────────────────────────────────────────────────────
// List recent admin_broadcast notifications (one per unique title/createdAt window)
adminNotificationsRouter.get('/broadcasts', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);

  const rows = await db
    .select({
      title:     notifications.title,
      body:      notifications.body,
      link:      notifications.link,
      createdAt: sql<string>`min(${notifications.createdAt})`,
      reach:     sql<number>`cast(count(*) as int)`,
    })
    .from(notifications)
    .where(eq(notifications.type, 'admin_broadcast'))
    .groupBy(notifications.title, notifications.body, notifications.link)
    .orderBy(desc(sql`min(${notifications.createdAt})`))
    .limit(limit);

  return c.json({ data: rows });
});

// ─── GET /log ─────────────────────────────────────────────────────────────────
adminNotificationsRouter.get('/log', async (c) => {
  const limit  = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const offset = Number(c.req.query('offset') ?? 0);
  const type   = c.req.query('type');
  const userId = c.req.query('userId');

  const conditions = [];
  if (type)   conditions.push(eq(notifications.type, type));
  if (userId) conditions.push(eq(notifications.userId, userId));

  const query = db.select().from(notifications);
  const rows = conditions.length
    ? await query.where(conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => sql`${a} AND ${b}`))
      .orderBy(desc(notifications.createdAt)).limit(limit).offset(offset)
    : await query.orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);

  return c.json({ data: rows });
});
