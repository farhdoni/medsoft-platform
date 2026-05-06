import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  doctorProfiles,
  doctorPatients,
  aivitaAppointments,
  aivitaPrescriptions,
  doctorReviews,
} from '@medsoft/db';
import { eq, and, gte, count } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorStatsRouter = new Hono();

doctorStatsRouter.use('*', requireAivitaAuth);

// GET / — общая статистика врача
doctorStatsRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');

  const [profile] = await db.select({
    totalConsultations: doctorProfiles.totalConsultations,
    totalPatients: doctorProfiles.totalPatients,
    monthlyConsultations: doctorProfiles.monthlyConsultations,
    rating: doctorProfiles.rating,
    ratingCount: doctorProfiles.ratingCount,
    likesCount: doctorProfiles.likesCount,
    thanksCount: doctorProfiles.thanksCount,
    recommendsCount: doctorProfiles.recommendsCount,
  }).from(doctorProfiles)
    .where(eq(doctorProfiles.userId, doctorId))
    .limit(1);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ activePatients }] = await db.select({ activePatients: count() })
    .from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.status, 'active')));

  const [{ pendingAppointments }] = await db.select({ pendingAppointments: count() })
    .from(aivitaAppointments)
    .where(and(
      eq(aivitaAppointments.doctorId, doctorId),
      eq(aivitaAppointments.status, 'scheduled'),
    ));

  const [{ monthlyPrescriptions }] = await db.select({ monthlyPrescriptions: count() })
    .from(aivitaPrescriptions)
    .where(and(
      eq(aivitaPrescriptions.doctorId, doctorId),
      gte(aivitaPrescriptions.createdAt, monthStart),
    ));

  const [{ recentReviews }] = await db.select({ recentReviews: count() })
    .from(doctorReviews)
    .where(and(
      eq(doctorReviews.doctorId, doctorId),
      gte(doctorReviews.createdAt, monthStart),
    ));

  return c.json({
    data: {
      ...profile,
      activePatients,
      pendingAppointments,
      monthlyPrescriptions,
      recentReviews,
    },
  });
});

// GET /monthly — помесячная разбивка за последние 6 месяцев
doctorStatsRouter.get('/monthly', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const months: Array<{ month: string; appointments: number; prescriptions: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [{ appts }] = await db.select({ appts: count() })
      .from(aivitaAppointments)
      .where(and(
        eq(aivitaAppointments.doctorId, doctorId),
        gte(aivitaAppointments.scheduledAt, start),
      ));

    const [{ presc }] = await db.select({ presc: count() })
      .from(aivitaPrescriptions)
      .where(and(
        eq(aivitaPrescriptions.doctorId, doctorId),
        gte(aivitaPrescriptions.createdAt, start),
      ));

    months.push({
      month: start.toISOString().slice(0, 7),
      appointments: appts,
      prescriptions: presc,
    });
  }

  return c.json({ data: months });
});
