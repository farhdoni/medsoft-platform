import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@medsoft/db';
import { aivitaUsers, aivitaPrescriptions, prescriptionTemplates } from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorPrescriptionsRouter = new Hono();

doctorPrescriptionsRouter.use('*', requireAivitaAuth);

// GET / — назначения врача (с фильтрами)
doctorPrescriptionsRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { patientId, status, type } = c.req.query();

  const conditions = [eq(aivitaPrescriptions.doctorId, doctorId)];
  if (patientId) conditions.push(eq(aivitaPrescriptions.patientId, patientId));
  if (status) conditions.push(eq(aivitaPrescriptions.status, status));
  if (type) conditions.push(eq(aivitaPrescriptions.type, type));

  const data = await db.select({
    prescription: aivitaPrescriptions,
    patient: { id: aivitaUsers.id, name: aivitaUsers.name },
  }).from(aivitaPrescriptions)
    .innerJoin(aivitaUsers, eq(aivitaPrescriptions.patientId, aivitaUsers.id))
    .where(and(...conditions))
    .orderBy(desc(aivitaPrescriptions.createdAt));
  return c.json({ data });
});

// POST / — создать назначение
doctorPrescriptionsRouter.post('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    patientId: string;
    appointmentId?: string;
    type: string;
    title: string;
    details?: string;
    frequency?: string;
    durationDays?: number;
    dueDate?: string;
    templateId?: string;
  };

  const [row] = await db.insert(aivitaPrescriptions).values({
    doctorId,
    patientId: body.patientId,
    appointmentId: body.appointmentId ?? null,
    type: body.type,
    title: body.title,
    details: body.details ?? null,
    frequency: body.frequency ?? null,
    durationDays: body.durationDays ?? null,
    dueDate: body.dueDate ?? null,
  }).returning();

  if (body.templateId) {
    await db.update(prescriptionTemplates)
      .set({ usageCount: sql`usage_count + 1` })
      .where(eq(prescriptionTemplates.id, body.templateId));
  }

  return c.json({ data: row });
});

// PUT /:id
doctorPrescriptionsRouter.put('/:id', async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.doctorId;
  const [updated] = await db.update(aivitaPrescriptions).set(body as any)
    .where(and(
      eq(aivitaPrescriptions.id, c.req.param('id')),
      eq(aivitaPrescriptions.doctorId, c.get('aivitaUserId')),
    )).returning();
  return c.json({ data: updated });
});

// GET /patient — назначения ДЛЯ пациента
doctorPrescriptionsRouter.get('/patient', async (c) => {
  const patientId = c.get('aivitaUserId');
  const data = await db.select({
    prescription: aivitaPrescriptions,
    doctor: { id: aivitaUsers.id, name: aivitaUsers.name },
  }).from(aivitaPrescriptions)
    .innerJoin(aivitaUsers, eq(aivitaPrescriptions.doctorId, aivitaUsers.id))
    .where(eq(aivitaPrescriptions.patientId, patientId))
    .orderBy(desc(aivitaPrescriptions.createdAt));
  return c.json({ data });
});
