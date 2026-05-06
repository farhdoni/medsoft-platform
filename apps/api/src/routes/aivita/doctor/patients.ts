import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  doctorPatients,
  healthProfiles,
  aivitaAppointments,
  aivitaPrescriptions,
  vitals,
} from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorPatientsRouter = new Hono();

doctorPatientsRouter.use('*', requireAivitaAuth);

// GET / — мои пациенты
doctorPatientsRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { status } = c.req.query();

  let baseQuery = db.select({
    connection: doctorPatients,
    user: {
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      avatarUrl: aivitaUsers.avatarUrl,
    },
  }).from(doctorPatients)
    .innerJoin(aivitaUsers, eq(doctorPatients.patientId, aivitaUsers.id))
    .where(
      status
        ? and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.status, status))
        : eq(doctorPatients.doctorId, doctorId)
    );

  const data = await baseQuery.orderBy(desc(doctorPatients.lastConsultationAt));
  return c.json({ data });
});

// GET /:id — полная карточка пациента
doctorPatientsRouter.get('/:id', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const patientId = c.req.param('id');

  const [connection] = await db.select().from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
    .limit(1);
  if (!connection) return c.json({ error: 'Patient not found' }, 404);

  const [user] = await db.select().from(aivitaUsers)
    .where(eq(aivitaUsers.id, patientId)).limit(1);
  const [profile] = await db.select().from(healthProfiles)
    .where(eq(healthProfiles.userId, patientId)).limit(1);

  const latestVitals = await db.select().from(vitals)
    .where(eq(vitals.userId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(10);

  return c.json({ data: { user, profile, connection, latestVitals } });
});

// POST /accept — принять запрос пациента
doctorPatientsRouter.post('/accept', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { patientId } = await c.req.json() as { patientId: string };
  await db.update(doctorPatients)
    .set({ status: 'active', connectedAt: new Date() })
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)));
  return c.json({ data: { success: true } });
});

// POST /archive — архивировать
doctorPatientsRouter.post('/archive', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const { patientId } = await c.req.json() as { patientId: string };
  await db.update(doctorPatients)
    .set({ status: 'archived' })
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)));
  return c.json({ data: { success: true } });
});

// PUT /:id/notes — заметки о пациенте
doctorPatientsRouter.put('/:id/notes', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const patientId = c.req.param('id');
  const { notes } = await c.req.json() as { notes: string };
  await db.update(doctorPatients).set({ notes })
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)));
  return c.json({ data: { success: true } });
});

// GET /:id/timeline — таймлайн пациента
doctorPatientsRouter.get('/:id/timeline', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const patientId = c.req.param('id');
  const limitParam = parseInt(c.req.query('limit') || '20');

  const [connection] = await db.select().from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
    .limit(1);
  if (!connection) return c.json({ error: 'Patient not found' }, 404);

  const [appts, presc, vitalsData] = await Promise.all([
    db.select().from(aivitaAppointments)
      .where(and(eq(aivitaAppointments.doctorId, doctorId), eq(aivitaAppointments.patientId, patientId)))
      .orderBy(desc(aivitaAppointments.scheduledAt)).limit(limitParam),
    db.select().from(aivitaPrescriptions)
      .where(and(eq(aivitaPrescriptions.doctorId, doctorId), eq(aivitaPrescriptions.patientId, patientId)))
      .orderBy(desc(aivitaPrescriptions.createdAt)).limit(20),
    db.select().from(vitals)
      .where(eq(vitals.userId, patientId))
      .orderBy(desc(vitals.recordedAt)).limit(20),
  ]);

  const timeline = [
    ...appts.map(a => ({ date: a.scheduledAt, type: 'appointment', data: a })),
    ...presc.map(p => ({ date: p.createdAt, type: 'prescription', data: p })),
    ...vitalsData.map(v => ({ date: v.recordedAt, type: 'vital', data: v })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return c.json({ data: timeline });
});
