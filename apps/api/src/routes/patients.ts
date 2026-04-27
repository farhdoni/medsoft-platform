import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { patients } from '@medsoft/db/schema';
import { eq, isNull, ilike, and, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { createPatientSchema, updatePatientSchema, patientFiltersSchema } from '@medsoft/shared';

const router = new Hono();
router.use('*', requireAuth);

router.get('/', zValidator('query', patientFiltersSchema), async (c) => {
  const { search, status, bloodGroup, isMinor, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [isNull(patients.deletedAt)];
  if (search) {
    conditions.push(or(
      ilike(patients.fullName, `%${search}%`),
      ilike(patients.phone, `%${search}%`),
      ilike(patients.email, `%${search}%`),
    )!);
  }
  if (status) conditions.push(eq(patients.status, status));
  if (bloodGroup) conditions.push(eq(patients.bloodGroup, bloodGroup));
  if (isMinor !== undefined) conditions.push(eq(patients.isMinor, isMinor));

  const [rows, countRow] = await Promise.all([
    db.select().from(patients).where(and(...conditions)).limit(limit).offset(offset).orderBy(patients.createdAt),
    db.$count(patients, and(...conditions)),
  ]);

  return c.json({ data: rows, total: Number(countRow), page, limit });
});

router.get('/:id', async (c) => {
  const row = await db.query.patients.findFirst({
    where: and(eq(patients.id, c.req.param('id')), isNull(patients.deletedAt)),
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.post('/', zValidator('json', createPatientSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await db.insert(patients).values({
    ...data,
    dateOfBirth: data.dateOfBirth ?? null,
    depositBalance: '0',
    depositCurrency: 'UZS',
  }).returning();
  return c.json(row, 201);
});

router.patch('/:id', zValidator('json', updatePatientSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await db.update(patients)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(patients.id, c.req.param('id')), isNull(patients.deletedAt)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.delete('/:id', async (c) => {
  const [row] = await db.update(patients)
    .set({ deletedAt: new Date() })
    .where(and(eq(patients.id, c.req.param('id')), isNull(patients.deletedAt)))
    .returning({ id: patients.id });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export { router as patientsRouter };
