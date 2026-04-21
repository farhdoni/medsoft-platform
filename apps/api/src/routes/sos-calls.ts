import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { sosCalls } from '@medsoft/db';
import { eq, isNull, and, notInArray, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const sosCallsRouter = new Hono();
sosCallsRouter.use('*', requireAuth);

sosCallsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
  const status = c.req.query('status');
  const offset = (page - 1) * limit;
  const conditions = [isNull(sosCalls.deletedAt)];
  if (status) conditions.push(eq(sosCalls.status, status as never));
  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(sosCalls).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(sosCalls).where(where),
  ]);
  return c.json({ data: rows, total: count, page, limit });
});

sosCallsRouter.get('/:id', async (c) => {
  const [row] = await db.select().from(sosCalls).where(and(eq(sosCalls.id, c.req.param('id')), isNull(sosCalls.deletedAt))).limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json(row);
});

const createSosSchema = z.object({
  patientId: z.string().uuid(),
  locationLat: z.string(),
  locationLng: z.string(),
  ehrSnapshot: z.record(z.unknown()),
  patientNotes: z.string().optional(),
  triggeredFrom: z.enum(['mobile_app', 'smart_mirror', 'wearable', 'manual']).default('manual'),
});

sosCallsRouter.post('/', zValidator('json', createSosSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.insert(sosCalls).values(data as never).returning();
  await logAudit(admin.id, 'sos.create', 'sos_call', row.id);
  return c.json(row, 201);
});

sosCallsRouter.patch('/:id/assign', async (c) => {
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.update(sosCalls).set({
    assignedAdminId: admin.id,
    assignedAt: new Date(),
    status: 'operator_assigned',
    updatedAt: new Date(),
  }).where(eq(sosCalls.id, c.req.param('id'))).returning();
  await logAudit(admin.id, 'sos.assign', 'sos_call', c.req.param('id'));
  return c.json(row);
});

sosCallsRouter.post('/:id/resolve', zValidator('json', z.object({ resolutionSummary: z.string() })), async (c) => {
  const { resolutionSummary } = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.update(sosCalls).set({
    status: 'resolved',
    resolvedAt: new Date(),
    resolutionSummary,
    updatedAt: new Date(),
  }).where(eq(sosCalls.id, c.req.param('id'))).returning();
  await logAudit(admin.id, 'sos.resolve', 'sos_call', c.req.param('id'));
  return c.json(row);
});

sosCallsRouter.delete('/:id', async (c) => {
  const admin = c.get('admin' as never) as { id: string };
  await db.update(sosCalls).set({ deletedAt: new Date() }).where(eq(sosCalls.id, c.req.param('id')));
  await logAudit(admin.id, 'sos.delete', 'sos_call', c.req.param('id'));
  return c.json({ message: 'Deleted' });
});
