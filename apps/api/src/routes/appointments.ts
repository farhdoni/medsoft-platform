import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { appointments } from '@medsoft/db';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { createAppointmentSchema, updateAppointmentSchema } from '@medsoft/shared';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const appointmentsRouter = new Hono();
appointmentsRouter.use('*', requireAuth);

appointmentsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
  const status = c.req.query('status');
  const offset = (page - 1) * limit;
  const conditions = [isNull(appointments.deletedAt)];
  if (status) conditions.push(eq(appointments.status, status as never));
  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(appointments).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(appointments).where(where),
  ]);
  return c.json({ data: rows, total: count, page, limit });
});

appointmentsRouter.get('/:id', async (c) => {
  const [row] = await db.select().from(appointments).where(and(eq(appointments.id, c.req.param('id')), isNull(appointments.deletedAt))).limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json(row);
});

appointmentsRouter.post('/', zValidator('json', createAppointmentSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.insert(appointments).values({ ...data, scheduledAt: new Date(data.scheduledAt) } as never).returning();
  await logAudit(admin.id, 'appointment.create', 'appointment', row.id);
  return c.json(row, 201);
});

appointmentsRouter.patch('/:id', zValidator('json', updateAppointmentSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [before] = await db.select().from(appointments).where(eq(appointments.id, c.req.param('id'))).limit(1);
  if (!before) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const payload = { ...data, ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}), updatedAt: new Date() };
  const [row] = await db.update(appointments).set(payload as never).where(eq(appointments.id, c.req.param('id'))).returning();
  await logAudit(admin.id, 'appointment.update', 'appointment', row.id, before as never, row as never);
  return c.json(row);
});

appointmentsRouter.delete('/:id', async (c) => {
  const admin = c.get('admin' as never) as { id: string };
  await db.update(appointments).set({ deletedAt: new Date() }).where(eq(appointments.id, c.req.param('id')));
  await logAudit(admin.id, 'appointment.delete', 'appointment', c.req.param('id'));
  return c.json({ message: 'Deleted' });
});
