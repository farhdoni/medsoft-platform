import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { aivitaReferrals, aivitaUsers } from '@medsoft/db';
import { eq, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorReferralsRouter = new Hono();

doctorReferralsRouter.use('*', requireAivitaAuth);

// GET / — мои направления (как направляющий врач)
doctorReferralsRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const data = await db.select({
    referral: aivitaReferrals,
    patient: { id: aivitaUsers.id, name: aivitaUsers.name },
  }).from(aivitaReferrals)
    .innerJoin(aivitaUsers, eq(aivitaReferrals.patientId, aivitaUsers.id))
    .where(eq(aivitaReferrals.fromDoctorId, doctorId))
    .orderBy(desc(aivitaReferrals.createdAt));
  return c.json({ data });
});

// GET /incoming — входящие направления (я принимающий врач)
doctorReferralsRouter.get('/incoming', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const data = await db.select({
    referral: aivitaReferrals,
    patient: { id: aivitaUsers.id, name: aivitaUsers.name },
  }).from(aivitaReferrals)
    .innerJoin(aivitaUsers, eq(aivitaReferrals.patientId, aivitaUsers.id))
    .where(eq(aivitaReferrals.toDoctorId, doctorId))
    .orderBy(desc(aivitaReferrals.createdAt));
  return c.json({ data });
});

// POST / — создать направление
doctorReferralsRouter.post('/', async (c) => {
  const fromDoctorId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    patientId: string;
    toDoctorId?: string;
    toSpecialization: string;
    reason: string;
    appointmentId?: string;
    urgency?: string;
  };

  const [row] = await db.insert(aivitaReferrals).values({
    fromDoctorId,
    patientId: body.patientId,
    toDoctorId: body.toDoctorId ?? null,
    toSpecialization: body.toSpecialization,
    reason: body.reason,
    appointmentId: body.appointmentId ?? null,
    urgency: body.urgency ?? 'routine',
  }).returning();
  return c.json({ data: row });
});

// PUT /:id/status — обновить статус направления
doctorReferralsRouter.put('/:id/status', async (c) => {
  const { status } = await c.req.json() as { status: string };
  const [updated] = await db.update(aivitaReferrals)
    .set({ status })
    .where(eq(aivitaReferrals.id, c.req.param('id')))
    .returning();
  return c.json({ data: updated });
});
