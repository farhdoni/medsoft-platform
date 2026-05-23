import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  healthProfiles,
  allergies,
  chronicConditions,
  medicalCards,
  vitals,
} from '@medsoft/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const cardRouter = new Hono();

/** Generate sequential AI-YEAR-NNNNN card code (matches onboarding format) */
async function generateCardCode(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `AI-${year}-%`;
  const [last] = await db
    .select({ cardCode: medicalCards.cardCode })
    .from(medicalCards)
    .where(sql`${medicalCards.cardCode} LIKE ${pattern}`)
    .orderBy(desc(medicalCards.cardCode))
    .limit(1);

  let nextNum = 1;
  if (last?.cardCode) {
    const parts = last.cardCode.split('-');
    const n = parseInt(parts[2] ?? '0', 10);
    if (!isNaN(n)) nextNum = n + 1;
  }
  return `AI-${year}-${String(nextNum).padStart(5, '0')}`;
}

// ── AUTH REQUIRED (registered BEFORE public /:code to avoid wildcard interception) ──

const authRoutes = new Hono();
authRoutes.use('*', requireAivitaAuth);

// GET /my — get or auto-create card (race-condition safe via upsert)
authRoutes.get('/my', async (c) => {
  const userId = c.get('aivitaUserId');

  // Try to find existing card first
  let [card] = await db.select().from(medicalCards)
    .where(eq(medicalCards.userId, userId)).limit(1);

  if (!card) {
    const code = await generateCardCode();
    // Use ON CONFLICT DO NOTHING to handle race conditions (userId is UNIQUE)
    await db.insert(medicalCards)
      .values({ userId, cardCode: code })
      .onConflictDoNothing();
    // Re-fetch — whether we inserted or someone else raced us, card now exists
    [card] = await db.select().from(medicalCards)
      .where(eq(medicalCards.userId, userId)).limit(1);
  }

  if (!card) {
    // This should never happen, but be safe
    return c.json({ error: 'Failed to create medical card' }, 500);
  }

  return c.json({
    data: {
      cardCode: card.cardCode,
      url: `https://aivita.uz/card/${card.cardCode}`,
      isActive: card.isActive,
      pinProtected: card.pinProtected,
      accessCount: card.accessCount,
    },
  });
});

// POST /regenerate
authRoutes.post('/regenerate', async (c) => {
  const userId = c.get('aivitaUserId');
  const code = await generateCardCode();
  const [updated] = await db.update(medicalCards)
    .set({ cardCode: code })
    .where(eq(medicalCards.userId, userId))
    .returning();
  return c.json({ data: { cardCode: updated.cardCode, url: `https://aivita.uz/card/${updated.cardCode}` } });
});

// PUT /deactivate
authRoutes.put('/deactivate', async (c) => {
  await db.update(medicalCards).set({ isActive: false })
    .where(eq(medicalCards.userId, c.get('aivitaUserId')));
  return c.json({ data: { success: true } });
});

// PUT /activate
authRoutes.put('/activate', async (c) => {
  await db.update(medicalCards).set({ isActive: true })
    .where(eq(medicalCards.userId, c.get('aivitaUserId')));
  return c.json({ data: { success: true } });
});

// GET /:code/full — doctors only
authRoutes.get('/:code/full', async (c) => {
  const code = c.req.param('code').toUpperCase();
  const requesterId = c.get('aivitaUserId');

  const [requester] = await db.select({ role: aivitaUsers.role })
    .from(aivitaUsers).where(eq(aivitaUsers.id, requesterId)).limit(1);
  if (requester?.role !== 'doctor') return c.json({ error: 'Only doctors can view full card' }, 403);

  const [card] = await db.select().from(medicalCards)
    .where(eq(medicalCards.cardCode, code)).limit(1);
  if (!card) return c.json({ error: 'Not found' }, 404);

  const [user] = await db.select().from(aivitaUsers)
    .where(eq(aivitaUsers.id, card.userId)).limit(1);
  const [profile] = await db.select().from(healthProfiles)
    .where(eq(healthProfiles.userId, card.userId)).limit(1);
  const recentVitals = await db.select().from(vitals)
    .where(eq(vitals.userId, card.userId))
    .orderBy(desc(vitals.recordedAt)).limit(20);
  const allergyRowsFull = await db.select().from(allergies)
    .where(eq(allergies.userId, card.userId));
  const chronicRowsFull = await db.select().from(chronicConditions)
    .where(eq(chronicConditions.userId, card.userId));

  return c.json({ data: { user, profile, vitals: recentVitals, allergies: allergyRowsFull, chronicConditions: chronicRowsFull } });
});

// Mount auth routes FIRST — so /my, /regenerate, etc. take priority over /:code
cardRouter.route('/', authRoutes);

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// GET /:code — public mini card (catch-all, must be LAST)
cardRouter.get('/:code', async (c) => {
  const code = c.req.param('code').toUpperCase();

  const [card] = await db.select().from(medicalCards)
    .where(and(eq(medicalCards.cardCode, code), eq(medicalCards.isActive, true))).limit(1);
  if (!card) return c.json({ error: 'Card not found or deactivated' }, 404);

  await db.update(medicalCards).set({
    accessCount: sql`${medicalCards.accessCount} + 1`,
    lastAccessedAt: new Date(),
  }).where(eq(medicalCards.id, card.id));

  const [user] = await db.select({ name: aivitaUsers.name })
    .from(aivitaUsers).where(eq(aivitaUsers.id, card.userId)).limit(1);
  const [profile] = await db.select({
    bloodType: healthProfiles.bloodType,
    emergencyContactName: healthProfiles.emergencyContactName,
    emergencyContactPhone: healthProfiles.emergencyContactPhone,
  }).from(healthProfiles).where(eq(healthProfiles.userId, card.userId)).limit(1);

  const allergyRows = await db.select({ allergen: allergies.allergen })
    .from(allergies).where(eq(allergies.userId, card.userId));
  const chronicRows = await db.select({ name: chronicConditions.name })
    .from(chronicConditions).where(eq(chronicConditions.userId, card.userId));

  return c.json({
    data: {
      name: user?.name || 'Неизвестно',
      bloodGroup: profile?.bloodType || 'не указано',
      allergies: allergyRows.length ? allergyRows.map(a => a.allergen).join(', ') : 'нет',
      chronicDiseases: chronicRows.length ? chronicRows.map(r => r.name).join(', ') : 'нет',
      currentMedications: 'см. у лечащего врача',
      emergencyContactName: profile?.emergencyContactName || 'не указан',
      emergencyContactPhone: profile?.emergencyContactPhone || null,
    },
  });
});

export default cardRouter;
