import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorReviews, aivitaUsers, doctorProfiles } from '@medsoft/db';
import { eq, and, desc, avg, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorReviewsRouter = new Hono();

// GET /doctor/:id — отзывы о враче (публичный)
doctorReviewsRouter.get('/doctor/:id', async (c) => {
  const doctorId = c.req.param('id');
  const data = await db.select({
    review: doctorReviews,
    patient: { id: aivitaUsers.id, name: aivitaUsers.name, avatarUrl: aivitaUsers.avatarUrl },
  }).from(doctorReviews)
    .innerJoin(aivitaUsers, eq(doctorReviews.patientId, aivitaUsers.id))
    .where(eq(doctorReviews.doctorId, doctorId))
    .orderBy(desc(doctorReviews.createdAt));
  return c.json({ data });
});

// POST / — оставить отзыв (auth required)
doctorReviewsRouter.post('/', requireAivitaAuth, async (c) => {
  const patientId = c.get('aivitaUserId');
  const body = await c.req.json() as {
    doctorId: string;
    appointmentId?: string;
    rating: number;
    text?: string;
    isAnonymous?: boolean;
  };

  const [existing] = await db.select().from(doctorReviews)
    .where(and(eq(doctorReviews.patientId, patientId), eq(doctorReviews.doctorId, body.doctorId)))
    .limit(1);
  if (existing) return c.json({ error: 'Already reviewed' }, 409);

  const [row] = await db.insert(doctorReviews).values({
    doctorId: body.doctorId,
    patientId,
    appointmentId: body.appointmentId ?? null,
    rating: body.rating,
    text: body.text ?? null,
    isAnonymous: body.isAnonymous ?? false,
  }).returning();

  // Recalculate average rating
  const [result] = await db.select({ avg: avg(doctorReviews.rating) })
    .from(doctorReviews)
    .where(eq(doctorReviews.doctorId, body.doctorId));
  const newRating = result?.avg ? parseFloat(String(result.avg)) : body.rating;

  await db.update(doctorProfiles)
    .set({
      rating: Math.round(newRating * 10) / 10,
      ratingCount: sql`rating_count + 1`,
    })
    .where(eq(doctorProfiles.userId, body.doctorId));

  return c.json({ data: row });
});
