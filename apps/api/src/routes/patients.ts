import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { patients } from '@medsoft/db';
import { eq, isNull, ilike, and, sql } from 'drizzle-orm';
import { createPatientSchema, updatePatientSchema } from '@medsoft/shared';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const patientsRouter = new Hono();
patientsRouter.use('*', requireAuth);

patientsRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
  const q = c.req.query('q');
  const status = c.req.query('status');
  const offset = (page - 1) * limit;

  const conditions = [isNull(patients.deletedAt)];
  if (q) conditions.push(ilike(patients.fullName, `%${q}%`));
  if (status) conditions.push(eq(patients.status, status as never));

  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(patients).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(patients).where(where),
  ]);

  return c.json({ data: rows, total: count, page, limit });
});

patientsRouter.get('/:id', async (c) => {
  const [row] = await db.select().from(patients).where(and(eq(patients.id, c.req.param('id')), isNull(patients.deletedAt))).limit(1);
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Patient not found' } }, 404);
  return c.json(row);
});

patientsRouter.post('/', zValidator('json', createPatientSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [row] = await db.insert(patients).values(data as never).returning();
  await logAudit(admin.id, 'patient.create', 'patient', row.id, undefined, row as never);
  return c.json(row, 201);
});

patientsRouter.patch('/:id', zValidator('json', updatePatientSchema), async (c) => {
  const data = c.req.valid('json');
  const admin = c.get('admin' as never) as { id: string };
  const [before] = await db.select().from(patients).where(eq(patients.id, c.req.param('id'))).limit(1);
  if (!before) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const [row] = await db.update(patients).set({ ...(data as Record<string, unknown>), updatedAt: new Date() }).where(eq(patients.id, c.req.param('id'))).returning();
  await logAudit(admin.id, 'patient.update', 'patient', row.id, before as never, row as never);
  return c.json(row);
});

patientsRouter.delete('/:id', async (c) => {
  const admin = c.get('admin' as never) as { id: string };
  const [before] = await db.select().from(patients).where(eq(patients.id, c.req.param('id'))).limit(1);
  if (!before) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  await db.update(patients).set({ deletedAt: new Date() }).where(eq(patients.id, c.req.param('id')));
  await logAudit(admin.id, 'patient.delete', 'patient', c.req.param('id'));
  return c.json({ message: 'Deleted' });
});
