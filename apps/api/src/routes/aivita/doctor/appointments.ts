import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  aivitaAppointments,
  doctorPatients,
  doctorProfiles,
  doctorNotifications,
} from '@medsoft/db';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorAppointmentsRouter = new Hono();

// GET / — мои приёмы
doctorAppointmentsRouter.get('/', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { status, from, to } = c.req.query();

  const conditions = [eq(aivitaAppointments.doctorId, doctorId)];
  if (status) conditions.push(eq(aivitaAppointments.status, status));
  if (from) conditions.push(gte(aivitaAppointments.scheduledAt, new Date(from)));
  if (to) conditions.push(lte(aivitaAppointments.scheduledAt, new Date(to)));

  const data = await db.select({
    appointment: aivitaAppointments,
    patient: { id: aivitaUsers.id, name: aivitaUsers.name, avatarUrl: aivitaUsers.avatarUrl },
  }).from(aivitaAppointments)
    .innerJoin(aivitaUsers, eq(aivitaAppointments.patientId, aivitaUsers.id))
    .where(and(...conditions))
    .orderBy(desc(aivitaAppointments.scheduledAt));

  return c.json({ data });
});

// POST / — создать приём
doctorAppointmentsRouter.post('/', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    patientId: string;
    scheduledAt: string;
    durationMinutes?: number;
    type?: string;
    reason?: string;
  };

  const [row] = await db.insert(aivitaAppointments).values({
    doctorId,
    patientId: body.patientId,
    scheduledAt: new Date(body.scheduledAt),
    durationMinutes: body.durationMinutes ?? 30,
    type: body.type ?? 'offline',
    reason: body.reason ?? null,
  }).returning();

  return c.json({ data: row });
});

// PUT /:id — обновить (заметки, диагноз)
doctorAppointmentsRouter.put('/:id', requireAivitaAuth, async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  delete body.id;
  delete body.doctorId;
  delete body.patientId;

  const [updated] = await db.update(aivitaAppointments).set(body as any)
    .where(and(
      eq(aivitaAppointments.id, c.req.param('id')),
      eq(aivitaAppointments.doctorId, c.get('aivitaUserId')),
    )).returning();
  return c.json({ data: updated });
});

// PUT /:id/complete — завершить приём (транзакция)
doctorAppointmentsRouter.put('/:id/complete', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const appointmentId = c.req.param('id');
  const body = await c.req.json() as {
    doctorNotes?: string;
    diagnosis?: string;
    nextAppointment?: string;
  };

  const [appt] = await db.select().from(aivitaAppointments)
    .where(and(eq(aivitaAppointments.id, appointmentId), eq(aivitaAppointments.doctorId, doctorId)))
    .limit(1);
  if (!appt) return c.json({ error: 'Not found' }, 404);

  await db.transaction(async (tx) => {
    await tx.update(aivitaAppointments).set({
      status: 'completed',
      doctorNotes: body.doctorNotes ?? appt.doctorNotes,
      diagnosis: body.diagnosis ?? appt.diagnosis,
      nextAppointment: body.nextAppointment ? new Date(body.nextAppointment) : null,
    }).where(eq(aivitaAppointments.id, appointmentId));

    await tx.update(doctorPatients).set({
      consultationCount: sql`consultation_count + 1`,
      lastConsultationAt: new Date(),
    }).where(and(
      eq(doctorPatients.doctorId, doctorId),
      eq(doctorPatients.patientId, appt.patientId),
    ));

    await tx.update(doctorProfiles).set({
      totalConsultations: sql`total_consultations + 1`,
      monthlyConsultations: sql`monthly_consultations + 1`,
      updatedAt: new Date(),
    }).where(eq(doctorProfiles.userId, doctorId));

    const [conn] = await tx.select().from(doctorPatients)
      .where(and(
        eq(doctorPatients.doctorId, doctorId),
        eq(doctorPatients.patientId, appt.patientId),
      )).limit(1);
    if (conn && conn.consultationCount === 1) {
      await tx.update(doctorProfiles).set({
        totalPatients: sql`total_patients + 1`,
      }).where(eq(doctorProfiles.userId, doctorId));
    }
  });

  return c.json({ data: { success: true } });
});

// POST /book — пациент записывается
doctorAppointmentsRouter.post('/book', requireAivitaAuth, async (c) => {
  const patientId = c.get('aivitaUserId');
  const { doctorId, scheduledAt, reason } = await c.req.json() as {
    doctorId: string;
    scheduledAt: string;
    reason?: string;
  };

  const [appt] = await db.insert(aivitaAppointments).values({
    doctorId,
    patientId,
    scheduledAt: new Date(scheduledAt),
    reason: reason ?? null,
  }).returning();

  const [existing] = await db.select().from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
    .limit(1);
  if (!existing) {
    await db.insert(doctorPatients).values({
      doctorId,
      patientId,
      status: 'pending',
      connectedVia: 'manual',
    });
  }

  await db.insert(doctorNotifications).values({
    doctorId,
    type: 'appointment_new',
    title: 'Новая запись на приём',
    message: `Пациент записался на ${new Date(scheduledAt).toLocaleDateString('ru')}`,
    relatedPatientId: patientId,
    relatedAppointmentId: appt.id,
  });

  return c.json({ data: appt });
});

// GET /upcoming — ближайшие приёмы врача
doctorAppointmentsRouter.get('/upcoming', requireAivitaAuth, async (c) => {
  const doctorId = c.get('aivitaUserId');
  const data = await db.select({
    appointment: aivitaAppointments,
    patient: { id: aivitaUsers.id, name: aivitaUsers.name, avatarUrl: aivitaUsers.avatarUrl },
  }).from(aivitaAppointments)
    .innerJoin(aivitaUsers, eq(aivitaAppointments.patientId, aivitaUsers.id))
    .where(and(
      eq(aivitaAppointments.doctorId, doctorId),
      gte(aivitaAppointments.scheduledAt, new Date()),
      eq(aivitaAppointments.status, 'scheduled'),
    ))
    .orderBy(asc(aivitaAppointments.scheduledAt))
    .limit(10);
  return c.json({ data });
});
