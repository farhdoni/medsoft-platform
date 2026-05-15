import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  doctorProfiles, aivitaUsers, doctorReviews, doctorSchedule, aivitaAppointments,
} from '@medsoft/db';
import { eq, and, ilike, desc, asc, gte, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorCatalogRouter = new Hono();

// ─── GET / — каталог врачей (публичный) ──────────────────────────────────────
doctorCatalogRouter.get('/', async (c) => {
  const { specialization, city, q, sort, limit: lim, offset: off } = c.req.query();
  const limit = Math.min(Number(lim) || 20, 50);
  const offset = Number(off) || 0;

  const conditions: ReturnType<typeof eq>[] = [
    eq(doctorProfiles.showInCatalog, true),
    eq(doctorProfiles.isActive, true),
  ];

  if (specialization) conditions.push(ilike(doctorProfiles.specialization, `%${specialization}%`) as ReturnType<typeof eq>);
  if (city) conditions.push(ilike(doctorProfiles.city, `%${city}%`) as ReturnType<typeof eq>);
  if (q) conditions.push(ilike(aivitaUsers.name, `%${q}%`) as ReturnType<typeof eq>);

  const orderBy =
    sort === 'price'      ? asc(doctorProfiles.consultationPrice) :
    sort === 'experience' ? asc(doctorProfiles.experienceStartDate) :
                            desc(doctorProfiles.rating);

  const rows = await db.select({
    userId:             doctorProfiles.userId,
    specialization:     doctorProfiles.specialization,
    consultationPrice:  doctorProfiles.consultationPrice,
    rating:             doctorProfiles.rating,
    ratingCount:        doctorProfiles.ratingCount,
    totalPatients:      doctorProfiles.totalPatients,
    bio:                doctorProfiles.bio,
    city:               doctorProfiles.city,
    clinicName:         doctorProfiles.clinicName,
    clinicAddress:      doctorProfiles.clinicAddress,
    showPrice:          doctorProfiles.showPrice,
    showRating:         doctorProfiles.showRating,
    languages:          doctorProfiles.languages,
    photoUrl:           doctorProfiles.photoUrl,
    experienceStartDate: doctorProfiles.experienceStartDate,
    additionalSkills:   doctorProfiles.additionalSkills,
    verificationStatus: doctorProfiles.verificationStatus,
    name:               aivitaUsers.name,
    avatarUrl:          aivitaUsers.avatarUrl,
  })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// ─── GET /:id — публичная страница врача ─────────────────────────────────────
doctorCatalogRouter.get('/:id', async (c) => {
  const userId = c.req.param('id');

  const [row] = await db.select({
    profile: doctorProfiles,
    user: {
      id:        aivitaUsers.id,
      name:      aivitaUsers.name,
      avatarUrl: aivitaUsers.avatarUrl,
      email:     aivitaUsers.email,
    },
  })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(and(
      eq(doctorProfiles.userId, userId),
      eq(doctorProfiles.isActive, true),
    ))
    .limit(1);

  if (!row) return c.json({ error: 'Doctor not found' }, 404);

  if (!row.profile.showPrice)  (row.profile as Record<string, unknown>).consultationPrice = null;
  if (!row.profile.showRating) (row.profile as Record<string, unknown>).rating = null;
  if (!row.profile.showEmail)  (row.user as Record<string, unknown>).email = null;

  return c.json({ data: row });
});

// ─── GET /:id/reviews — отзывы о враче (публичные) ───────────────────────────
doctorCatalogRouter.get('/:id/reviews', async (c) => {
  const doctorId = c.req.param('id');

  // Use alias to avoid join ambiguity on aivitaUsers
  const patientAlias = aivitaUsers;

  const reviews = await db
    .select({
      id:          doctorReviews.id,
      rating:      doctorReviews.rating,
      text:        doctorReviews.text,
      isAnonymous: doctorReviews.isAnonymous,
      createdAt:   doctorReviews.createdAt,
      reviewerName: aivitaUsers.name,
    })
    .from(doctorReviews)
    .innerJoin(aivitaUsers, eq(doctorReviews.patientId, aivitaUsers.id))
    .where(eq(doctorReviews.doctorId, doctorId))
    .orderBy(desc(doctorReviews.createdAt))
    .limit(20);

  const masked = reviews.map(r => ({
    ...r,
    reviewer: r.isAnonymous ? null : { name: r.reviewerName },
    reviewerName: undefined,
  }));

  return c.json({ data: masked });
});

// ─── GET /:id/schedule — расписание врача (шаблон по дням недели) ─────────────
doctorCatalogRouter.get('/:id/schedule', async (c) => {
  const doctorId = c.req.param('id');

  const schedule = await db
    .select()
    .from(doctorSchedule)
    .where(and(
      eq(doctorSchedule.doctorId, doctorId),
      eq(doctorSchedule.isActive, true),
    ))
    .orderBy(asc(doctorSchedule.dayOfWeek));

  return c.json({ data: schedule });
});

// ─── POST /:id/review — оставить отзыв (auth) ────────────────────────────────
doctorCatalogRouter.post('/:id/review', requireAivitaAuth, async (c) => {
  const doctorId  = c.req.param('id');
  const patientId = c.get('aivitaUserId');

  if (doctorId === patientId) {
    return c.json({ error: 'Cannot review yourself' }, 400);
  }

  const body = await c.req.json<{ rating: number; text?: string; isAnonymous?: boolean }>();
  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return c.json({ error: 'Rating must be 1-5' }, 400);
  }

  // Check existing review (doctor + patient, no appointmentId)
  const [existing] = await db
    .select({ id: doctorReviews.id })
    .from(doctorReviews)
    .where(and(
      eq(doctorReviews.doctorId, doctorId),
      eq(doctorReviews.patientId, patientId),
      sql`${doctorReviews.appointmentId} IS NULL`,
    ))
    .limit(1);

  if (existing) {
    return c.json({ error: 'You already reviewed this doctor' }, 409);
  }

  const [review] = await db.insert(doctorReviews).values({
    doctorId,
    patientId,
    rating,
    text:        body.text ?? null,
    isAnonymous: body.isAnonymous ?? false,
  }).returning();

  // Update doctor rating average
  const stats = await db
    .select({
      avg:   sql<number>`ROUND(AVG(${doctorReviews.rating})::numeric, 1)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(doctorReviews)
    .where(eq(doctorReviews.doctorId, doctorId));

  if (stats[0]) {
    await db.update(doctorProfiles)
      .set({ rating: stats[0].avg, ratingCount: stats[0].count })
      .where(eq(doctorProfiles.userId, doctorId));
  }

  return c.json({ data: review }, 201);
});

// ─── POST /:id/book — записаться на приём (auth) ─────────────────────────────
doctorCatalogRouter.post('/:id/book', requireAivitaAuth, async (c) => {
  const doctorId  = c.req.param('id');
  const patientId = c.get('aivitaUserId');

  if (doctorId === patientId) {
    return c.json({ error: 'Cannot book with yourself' }, 400);
  }

  const body = await c.req.json<{ scheduledAt: string; type?: string }>();
  if (!body.scheduledAt) {
    return c.json({ error: 'scheduledAt is required' }, 400);
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
    return c.json({ error: 'Invalid or past scheduledAt' }, 400);
  }

  // Check slot not already taken (same doctor, same time, not cancelled)
  const [conflict] = await db
    .select({ id: aivitaAppointments.id })
    .from(aivitaAppointments)
    .where(and(
      eq(aivitaAppointments.doctorId, doctorId),
      eq(aivitaAppointments.scheduledAt, scheduledAt),
      sql`${aivitaAppointments.status} != 'cancelled'`,
    ))
    .limit(1);

  if (conflict) {
    return c.json({ error: 'Slot already booked' }, 409);
  }

  const [appointment] = await db.insert(aivitaAppointments).values({
    doctorId,
    patientId,
    scheduledAt,
    type:   body.type ?? 'offline',
    status: 'scheduled',
  }).returning();

  // Increment totalPatients if new patient
  await db.execute(sql`
    UPDATE doctor_profiles
    SET total_patients = total_patients + 1
    WHERE user_id = ${doctorId}
      AND NOT EXISTS (
        SELECT 1 FROM aivita_appointments
        WHERE doctor_id = ${doctorId}
          AND patient_id = ${patientId}
          AND id != ${appointment.id}
      )
  `);

  return c.json({ data: appointment }, 201);
});
