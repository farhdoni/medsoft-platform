import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@medsoft/db';
import { aivitaUsers, aivitaPrescriptions, prescriptionTemplates, medicationSchedule } from '@medsoft/db';
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

  // Auto-create medication schedule when doctor prescribes a medication
  if (body.type === 'medication' && body.patientId) {
    try {
      const freq = (body.frequency ?? '').toLowerCase();
      let times: string[] = ['08:00'];
      if (freq.includes('2 раза') || freq.includes('дважды') || freq.includes('каждые 12')) {
        times = ['08:00', '20:00'];
      } else if (freq.includes('3 раза') || freq.includes('трижды') || freq.includes('каждые 8')) {
        times = ['08:00', '14:00', '20:00'];
      } else if (freq.includes('веч') || freq.includes('перед сном')) {
        times = ['21:00'];
      } else if (freq.includes('ден') && !freq.includes('2')) {
        times = ['08:00'];
      }

      const today = new Date().toISOString().split('T')[0];
      let endDate: string | null = null;
      if (body.durationDays) {
        const d = new Date();
        d.setDate(d.getDate() + body.durationDays);
        endDate = d.toISOString().split('T')[0];
      }

      await db.insert(medicationSchedule).values({
        userId: body.patientId,
        prescriptionId: row.id,
        title: body.title,
        dosage: body.details ?? null,
        frequency: body.frequency ?? '1 раз в день',
        times,
        durationDays: body.durationDays ?? null,
        startDate: today,
        endDate,
        instructions: null,
        createdBy: 'doctor',
        doctorId: doctorId,
      });
    } catch (err) {
      // Non-fatal: log and continue
      console.error('[Prescriptions] Failed to create medication schedule:', err);
    }
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
