import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { doctorProfiles, aivitaUsers } from '@medsoft/db';
import { eq, and, ilike, desc, gte } from 'drizzle-orm';

export const doctorCatalogRouter = new Hono();

// GET / — каталог врачей (публичный)
doctorCatalogRouter.get('/', async (c) => {
  const { specialization, city, search, minRating } = c.req.query();

  const conditions = [
    eq(doctorProfiles.showInCatalog, true),
    eq(doctorProfiles.isActive, true),
    eq(doctorProfiles.verificationStatus, 'verified'),
  ];

  if (specialization) conditions.push(eq(doctorProfiles.specialization, specialization));
  if (city) conditions.push(eq(doctorProfiles.city, city));
  if (minRating) conditions.push(gte(doctorProfiles.rating, parseFloat(minRating)));

  let query = db.select({
    profile: {
      id: doctorProfiles.id,
      userId: doctorProfiles.userId,
      specialization: doctorProfiles.specialization,
      consultationPrice: doctorProfiles.consultationPrice,
      rating: doctorProfiles.rating,
      ratingCount: doctorProfiles.ratingCount,
      likesCount: doctorProfiles.likesCount,
      totalConsultations: doctorProfiles.totalConsultations,
      totalPatients: doctorProfiles.totalPatients,
      bio: doctorProfiles.bio,
      city: doctorProfiles.city,
      clinicName: doctorProfiles.clinicName,
      showPrice: doctorProfiles.showPrice,
      showRating: doctorProfiles.showRating,
      languages: doctorProfiles.languages,
    },
    user: {
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      avatarUrl: aivitaUsers.avatarUrl,
    },
  }).from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(and(...conditions));

  const rows = await query.orderBy(desc(doctorProfiles.rating)).limit(50);

  // Apply search filter post-query (name search)
  const data = search
    ? rows.filter(r => r.user.name?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return c.json({ data });
});

// GET /:id — публичная страница врача
doctorCatalogRouter.get('/:id', async (c) => {
  const userId = c.req.param('id');

  const [row] = await db.select({
    profile: doctorProfiles,
    user: {
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      avatarUrl: aivitaUsers.avatarUrl,
      email: aivitaUsers.email,
    },
  }).from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(and(
      eq(doctorProfiles.userId, userId),
      eq(doctorProfiles.isActive, true),
    ))
    .limit(1);

  if (!row) return c.json({ error: 'Doctor not found' }, 404);

  // Mask sensitive fields based on visibility settings
  if (!row.profile.showPrice) (row.profile as Record<string, unknown>).consultationPrice = null;
  if (!row.profile.showRating) (row.profile as Record<string, unknown>).rating = null;
  if (!row.profile.showEmail) (row.user as Record<string, unknown>).email = null;

  return c.json({ data: row });
});
