import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { doctors } from '@medsoft/db';
import { eq, isNull, ilike, and, sql } from 'drizzle-orm';
import { createDoctorSchema, updateDoctorSchema } from '@medsoft/shared';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const doctorsRouter = new Hono();
doctorsRouter.use('*', requireAuth);

doctorsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
  const q = c.req.query('q');
  const status = c.req.query('status');
  const offset = (page - 1) * limit;
  const conditions = [isNull(doctors.deletedAt)];
  if (q) conditions.push(ilike(doctors.fullName, `%${q}%`));
  if (status) conditions.push(eq(doctors.status, status as never));
  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(doctors).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(doctors).where(where),
  ]);
  return c.json({ data: rows, total: count, page, limit });
});

doctorsRouter.get('/:id', async (c) => {
  const [row] = await db.select().from(doctors).where(and(eq(doctors.id, c.req.param('id')), isNull(doctors.deletedAt))).limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json(row);
});

doctorsRouter.post('/', zValidator('json', createDoctorSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.insert(doctors).values(data as never).returning();
  await logAudit(admin.id, 'doctor.create', 'doctor', row.id);
  return c.json(row, 201);
});

doctorsRouter.patch('/:id', zValidator('json', updateDoctorSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [before] = await db.select().from(doctors).where(eq(doctors.id, c.req.param('id'))).limit(1);
  if (!before) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const [row] = await db.update(doctors).set({ ...(data as Record<string, unknown>), updatedAt: new Date() }).where(eq(doctors.id, c.req.param('id'))).returning();
  await logAudit(admin.id, 'doctor.update', 'doctor', row.id, before as never, row as never);
  return c.json(row);
});

doctorsRouter.delete('/:id', async (c) => {
  const admin = c.get('admin' as never) as { id: string };
  const [before] = await db.select().from(doctors).where(eq(doctors.id, c.req.param('id'))).limit(1);
  if (!before) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  await db.update(doctors).set({ deletedAt: new Date() }).where(eq(doctors.id, c.req.param('id')));
  await logAudit(admin.id, 'doctor.delete', 'doctor', c.req.param('id'));
  return c.json({ message: 'Deleted' });
});
