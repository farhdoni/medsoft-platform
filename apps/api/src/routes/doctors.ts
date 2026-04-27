import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { doctors } from '@medsoft/db/schema';
import { eq, isNull, ilike, and, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { createDoctorSchema, updateDoctorSchema, doctorFiltersSchema } from '@medsoft/shared';

const router = new Hono();
router.use('*', requireAuth);

router.get('/', zValidator('query', doctorFiltersSchema), async (c) => {
  const { search, status, clinicId, specialization, acceptsTelemedicine, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [isNull(doctors.deletedAt)];
  if (search) {
    conditions.push(or(
      ilike(doctors.fullName, `%${search}%`),
      ilike(doctors.email, `%${search}%`),
      ilike(doctors.phone, `%${search}%`),
    )!);
  }
  if (status) conditions.push(eq(doctors.status, status));
  if (clinicId) conditions.push(eq(doctors.clinicId, clinicId));
  if (specialization) conditions.push(ilike(doctors.specialization, `%${specialization}%`));
  if (acceptsTelemedicine !== undefined) conditions.push(eq(doctors.acceptsTelemedicine, acceptsTelemedicine));

  const [rows, total] = await Promise.all([
    db.select().from(doctors).where(and(...conditions)).limit(limit).offset(offset).orderBy(doctors.createdAt),
    db.$count(doctors, and(...conditions)),
  ]);

  return c.json({ data: rows, total: Number(total), page, limit });
});

router.get('/:id', async (c) => {
  const row = await db.query.doctors.findFirst({
    where: and(eq(doctors.id, c.req.param('id')), isNull(doctors.deletedAt)),
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.post('/', zValidator('json', createDoctorSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await db.insert(doctors).values({
    ...data,
    consultationPriceUzs: String(data.consultationPriceUzs),
  }).returning();
  return c.json(row, 201);
});

router.patch('/:id', zValidator('json', updateDoctorSchema), async (c) => {
  const data = c.req.valid('json');
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.consultationPriceUzs !== undefined) {
    update.consultationPriceUzs = String(data.consultationPriceUzs);
  }
  const [row] = await db.update(doctors)
    .set(update)
    .where(and(eq(doctors.id, c.req.param('id')), isNull(doctors.deletedAt)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.delete('/:id', async (c) => {
  const [row] = await db.update(doctors)
    .set({ deletedAt: new Date() })
    .where(and(eq(doctors.id, c.req.param('id')), isNull(doctors.deletedAt)))
    .returning({ id: doctors.id });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export { router as doctorsRouter };
