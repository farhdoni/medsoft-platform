import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { clinics } from '@medsoft/db/schema';
import { eq, isNull, ilike, and, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { createClinicSchema, updateClinicSchema, clinicFiltersSchema } from '@medsoft/shared';

const router = new Hono();
router.use('*', requireAuth);

router.get('/', zValidator('query', clinicFiltersSchema), async (c) => {
  const { search, status, type, city, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [isNull(clinics.deletedAt)];
  if (search) {
    conditions.push(or(
      ilike(clinics.name, `%${search}%`),
      ilike(clinics.phone, `%${search}%`),
    )!);
  }
  if (status) conditions.push(eq(clinics.status, status));
  if (type) conditions.push(eq(clinics.type, type));
  if (city) conditions.push(ilike(clinics.city, `%${city}%`));

  const [rows, total] = await Promise.all([
    db.select().from(clinics).where(and(...conditions)).limit(limit).offset(offset).orderBy(clinics.createdAt),
    db.$count(clinics, and(...conditions)),
  ]);

  return c.json({ data: rows, total: Number(total), page, limit });
});

router.get('/:id', async (c) => {
  const row = await db.query.clinics.findFirst({
    where: and(eq(clinics.id, c.req.param('id')), isNull(clinics.deletedAt)),
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.post('/', zValidator('json', createClinicSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await db.insert(clinics).values({
    ...data,
    locationLat: data.locationLat !== undefined ? String(data.locationLat) : null,
    locationLng: data.locationLng !== undefined ? String(data.locationLng) : null,
    commissionPercent: String(data.commissionPercent ?? 0),
    contractSignedAt: data.contractSignedAt ? new Date(data.contractSignedAt) : null,
  }).returning();
  return c.json(row, 201);
});

router.patch('/:id', zValidator('json', updateClinicSchema), async (c) => {
  const data = c.req.valid('json');
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.locationLat !== undefined) update.locationLat = String(data.locationLat);
  if (data.locationLng !== undefined) update.locationLng = String(data.locationLng);
  if (data.commissionPercent !== undefined) update.commissionPercent = String(data.commissionPercent);
  if (data.contractSignedAt !== undefined) update.contractSignedAt = new Date(data.contractSignedAt);

  const [row] = await db.update(clinics)
    .set(update)
    .where(and(eq(clinics.id, c.req.param('id')), isNull(clinics.deletedAt)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.delete('/:id', async (c) => {
  const [row] = await db.update(clinics)
    .set({ deletedAt: new Date() })
    .where(and(eq(clinics.id, c.req.param('id')), isNull(clinics.deletedAt)))
    .returning({ id: clinics.id });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export { router as clinicsRouter };
