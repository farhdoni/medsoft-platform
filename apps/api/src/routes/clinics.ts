import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { clinics } from '@medsoft/db';
import { eq, isNull, ilike, and, sql } from 'drizzle-orm';
import { createClinicSchema, updateClinicSchema } from '@medsoft/shared';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const clinicsRouter = new Hono();
clinicsRouter.use('*', requireAuth);

clinicsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
  const q = c.req.query('q');
  const offset = (page - 1) * limit;
  const conditions = [isNull(clinics.deletedAt)];
  if (q) conditions.push(ilike(clinics.name, `%${q}%`));
  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(clinics).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(clinics).where(where),
  ]);
  return c.json({ data: rows, total: count, page, limit });
});

clinicsRouter.get('/:id', async (c) => {
  const [row] = await db.select().from(clinics).where(and(eq(clinics.id, c.req.param('id')), isNull(clinics.deletedAt))).limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json(row);
});

clinicsRouter.post('/', zValidator('json', createClinicSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.insert(clinics).values(data as never).returning();
  await logAudit(admin.id, 'clinic.create', 'clinic', row.id);
  return c.json(row, 201);
});

clinicsRouter.patch('/:id', zValidator('json', updateClinicSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [before] = await db.select().from(clinics).where(eq(clinics.id, c.req.param('id'))).limit(1);
  if (!before) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const [row] = await db.update(clinics).set({ ...(data as Record<string, unknown>), updatedAt: new Date() }).where(eq(clinics.id, c.req.param('id'))).returning();
  await logAudit(admin.id, 'clinic.update', 'clinic', row.id, before as never, row as never);
  return c.json(row);
});

clinicsRouter.delete('/:id', async (c) => {
  const admin = c.get('admin' as never) as { id: string };
  await db.update(clinics).set({ deletedAt: new Date() }).where(eq(clinics.id, c.req.param('id')));
  await logAudit(admin.id, 'clinic.delete', 'clinic', c.req.param('id'));
  return c.json({ message: 'Deleted' });
});
