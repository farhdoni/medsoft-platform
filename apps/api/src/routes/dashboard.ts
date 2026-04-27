import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { patients, doctors, clinics, appointments, transactions, sosCalls } from '@medsoft/db/schema';
import { isNull, eq, gte, and, sum, count } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = new Hono();
router.use('*', requireAuth);

router.get('/stats', async (c) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalPatients,
    totalDoctors,
    totalClinics,
    totalAppointments,
    appointmentsThisMonth,
    activeSosCalls,
    revenueResult,
  ] = await Promise.all([
    db.$count(patients, isNull(patients.deletedAt)),
    db.$count(doctors, isNull(doctors.deletedAt)),
    db.$count(clinics, isNull(clinics.deletedAt)),
    db.$count(appointments, isNull(appointments.deletedAt)),
    db.$count(appointments, and(isNull(appointments.deletedAt), gte(appointments.createdAt, thirtyDaysAgo))),
    db.$count(sosCalls, and(
      isNull(sosCalls.deletedAt),
      eq(sosCalls.status, 'triggered'),
    )),
    db.select({ total: sum(transactions.amountUzs) })
      .from(transactions)
      .where(and(isNull(transactions.deletedAt), eq(transactions.status, 'completed'))),
  ]);

  return c.json({
    totalPatients: Number(totalPatients),
    totalDoctors: Number(totalDoctors),
    totalClinics: Number(totalClinics),
    totalAppointments: Number(totalAppointments),
    appointmentsThisMonth: Number(appointmentsThisMonth),
    activeSosCalls: Number(activeSosCalls),
    totalRevenueUzs: Number(revenueResult[0]?.total ?? 0),
  });
});

router.get('/activity', async (c) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentAppointments = await db.select().from(appointments)
    .where(and(isNull(appointments.deletedAt), gte(appointments.createdAt, sevenDaysAgo)))
    .orderBy(appointments.createdAt)
    .limit(10);

  const recentSos = await db.select().from(sosCalls)
    .where(and(isNull(sosCalls.deletedAt), gte(sosCalls.createdAt, sevenDaysAgo)))
    .orderBy(sosCalls.createdAt)
    .limit(5);

  return c.json({ recentAppointments, recentSos });
});

export { router as dashboardRouter };
