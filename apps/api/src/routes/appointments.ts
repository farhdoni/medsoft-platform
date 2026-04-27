import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@medsoft/db';
import { appointments } from '@medsoft/db/schema';
import { eq, isNull, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { createAppointmentSchema, updateAppointmentSchema, appointmentFiltersSchema } from '@medsoft/shared';

const router = new Hono();
router.use('*', requireAuth);

router.get('/', zValidator('query', appointmentFiltersSchema), async (c) => {
  const { status, type, patientId, doctorId, clinicId, dateFrom, dateTo, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [isNull(appointments.deletedAt)];
  if (status) conditions.push(eq(appointments.status, status));
  if (type) conditions.push(eq(appointments.type, type));
  if (patientId) conditions.push(eq(appointments.patientId, patientId));
  if (doctorId) conditions.push(eq(appointments.doctorId, doctorId));
  if (clinicId) conditions.push(eq(appointments.clinicId, clinicId));
  if (dateFrom) conditions.push(gte(appointments.scheduledAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(appointments.scheduledAt, new Date(dateTo)));

  const [rows, total] = await Promise.all([
    db.select().from(appointments).where(and(...conditions)).limit(limit).offset(offset).orderBy(appointments.scheduledAt),
    db.$count(appointments, and(...conditions)),
  ]);

  return c.json({ data: rows, total: Number(total), page, limit });
});

router.get('/:id', async (c) => {
  const row = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, c.req.param('id')), isNull(appointments.deletedAt)),
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.post('/', zValidator('json', createAppointmentSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await db.insert(appointments).values({
    ...data,
    scheduledAt: new Date(data.scheduledAt),
    priceUzs: String(data.priceUzs),
  }).returning();
  return c.json(row, 201);
});

router.patch('/:id', zValidator('json', updateAppointmentSchema), async (c) => {
  const data = c.req.valid('json');
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.scheduledAt) update.scheduledAt = new Date(data.scheduledAt);
  if (data.priceUzs !== undefined) update.priceUzs = String(data.priceUzs);

  const [row] = await db.update(appointments)
    .set(update)
    .where(and(eq(appointments.id, c.req.param('id')), isNull(appointments.deletedAt)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

router.delete('/:id', async (c) => {
  const [row] = await db.update(appointments)
    .set({ deletedAt: new Date() })
    .where(and(eq(appointments.id, c.req.param('id')), isNull(appointments.deletedAt)))
    .returning({ id: appointments.id });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export { router as appointmentsRouter };
