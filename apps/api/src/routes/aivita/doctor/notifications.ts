import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorNotifications } from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorNotificationsRouter = new Hono();

doctorNotificationsRouter.use('*', requireAivitaAuth);

// GET / — уведомления врача
doctorNotificationsRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { unread } = c.req.query();

  const conditions = [eq(doctorNotifications.doctorId, doctorId)];
  if (unread === 'true') conditions.push(eq(doctorNotifications.isRead, false));

  const data = await db.select().from(doctorNotifications)
    .where(and(...conditions))
    .orderBy(desc(doctorNotifications.createdAt))
    .limit(50);
  return c.json({ data });
});

// PUT /:id/read — отметить как прочитанное
doctorNotificationsRouter.put('/:id/read', async (c) => {
  const doctorId = c.get('aivitaUserId');
  await db.update(doctorNotifications)
    .set({ isRead: true })
    .where(and(
      eq(doctorNotifications.id, c.req.param('id')),
      eq(doctorNotifications.doctorId, doctorId),
    ));
  return c.json({ data: { success: true } });
});

// PUT /read-all — отметить все как прочитанные
doctorNotificationsRouter.put('/read-all', async (c) => {
  const doctorId = c.get('aivitaUserId');
  await db.update(doctorNotifications)
    .set({ isRead: true })
    .where(eq(doctorNotifications.doctorId, doctorId));
  return c.json({ data: { success: true } });
});
