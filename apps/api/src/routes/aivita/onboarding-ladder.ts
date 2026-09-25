import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { aivitaUsers, healthProfiles, medicalCards, patientConsents, allergies, chronicConditions } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { generateCardNumber } from './onboarding.js';
import { clearNoneFlag, setNoneFlag } from '../../lib/medical-card-completion.js';
import { HEIGHT_CM_MIN, HEIGHT_CM_MAX, WEIGHT_KG_MIN, WEIGHT_KG_MAX, isValidHeightCm, isValidWeightKg } from '../../lib/survey-queue.js';
import { assertConsentIfFlagged } from '../../lib/consent-gate.js';
import { ageFromBirthDate } from '@medsoft/shared';

// ─── Part B: the new Consent → Q1 → R1 → Q2 → Done1 ladder ──────────────────
//
// A separate router from onboarding.ts (Flow A, the existing 6-step wizard)
// on purpose — Flow A's frontend/backend is untouched by design (flag-gated
// rollout: non-flagged accounts must see zero behavior change). This ladder
// deliberately does NOT write aivita_users.onboarding_step at all: every
// stage's completion is independently reconstructable from real data
// (a patient_consents row, health_profiles.gender/birthDate, isMinor +
// parentConsent, health_profiles.heightCm/weightKg, onboardingCompleted +
// a medicalCards row) — approved as the resume strategy over a numeric
// step counter specifically because a counter alone already proved
// unreliable (see fix/onboarding-flow-b-removal: 3 real accounts ended up
// onboardingCompleted=true with onboarding_step stuck at 0). Reusing that
// same column here would also risk colliding with Flow A's own meaning of
// each step number if an account is ever flagged, then unflagged.

export const aivitaOnboardingLadderRouter = new Hono();
aivitaOnboardingLadderRouter.use('*', requireAivitaAuth);

const CONSENT_TEXT_VERSION_MAX = 40;

// assertConsentIfFlagged (lib/consent-gate.ts): server-side enforcement,
// not just UI routing — page.tsx routes a non-consented flagged account to
// /consent first, but nothing stops a direct request to these endpoints
// bypassing the UI entirely. Flag-gated the same way the UI itself is —
// see that file's own comment for why an unconditional check here would
// have broken every write for every real account on deploy.

// ─── GET /status — where in the ladder this user actually is ────────────────
//
// Field-presence-based, not a step counter (see module comment). Every
// screen in the ladder calls this on mount to decide whether to render
// itself or redirect further along — including a user re-visiting a step
// they already completed (e.g. back button), which just shows their saved
// answer's screen state.

aivitaOnboardingLadderRouter.get('/status', async (c) => {
  const userId = c.get('aivitaUserId');

  const [user] = await db.select().from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);
  const [card] = await db.select({ cardCode: medicalCards.cardCode }).from(medicalCards).where(eq(medicalCards.userId, userId)).limit(1);
  const consentRow = await db.query.patientConsents.findFirst({
    where: eq(patientConsents.userId, userId),
    orderBy: (t, { desc }) => [desc(t.grantedAt)],
  });

  const hasConsent = !!consentRow; // presence of ANY row (even a past one) means the screen was completed
  const hasQ1 = !!(profile?.gender && profile?.birthDate);
  const isMinor = user?.isMinor ?? false;
  const parentConsentCleared = !isMinor || user?.parentConsent === true;
  const hasQ2 = !!(profile?.heightCm && profile?.weightKg);
  const completed = user?.onboardingCompleted ?? false;

  return c.json({
    data: {
      hasConsent,
      hasQ1,
      gender: profile?.gender ?? null,
      age: ageFromBirthDate(profile?.birthDate ?? null),
      isMinor,
      parentConsentCleared,
      hasQ2,
      heightCm: profile?.heightCm ?? null,
      weightKg: profile?.weightKg ?? null,
      completed,
      cardCode: card?.cardCode ?? null,
    },
  });
});

// ─── POST /consent ───────────────────────────────────────────────────────────

aivitaOnboardingLadderRouter.post(
  '/consent',
  zValidator('json', z.object({
    medicalDataConsent: z.literal(true), // mandatory — rejected outright if false/absent
    marketingConsent: z.boolean(),
    textVersion: z.string().trim().min(1).max(CONSENT_TEXT_VERSION_MAX),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { medicalDataConsent, marketingConsent, textVersion } = c.req.valid('json');

    await db.insert(patientConsents).values([
      { userId, consentType: 'data_processing', granted: medicalDataConsent, textVersion },
      { userId, consentType: 'marketing_emails', granted: marketingConsent, textVersion },
    ]);

    return c.json({ data: { ok: true } });
  },
);

// ─── POST /q1 — sex + age ────────────────────────────────────────────────────
//
// The ladder asks for a raw age (matching Q1.dc.html's number input, not a
// date picker), but every other part of the system (Health Score, PINFL
// cross-check, medical-card display) reads health_profiles.birthDate — so a
// synthetic birthDate (Jan 1 of the derived birth year) is stored instead of
// adding a parallel `age` column. This trades away knowing the exact
// birth month/day for consistency with the rest of the app; flagging it
// here plainly rather than leaving it implicit.

const Q1_AGE_MIN = 1;
const Q1_AGE_MAX = 120;

aivitaOnboardingLadderRouter.post(
  '/q1',
  zValidator('json', z.object({
    gender: z.enum(['male', 'female']),
    age: z.number().int().min(Q1_AGE_MIN).max(Q1_AGE_MAX),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    if (!(await assertConsentIfFlagged(userId))) return c.json({ error: 'consent_required' }, 403);
    const { gender, age } = c.req.valid('json');

    const birthYear = new Date().getFullYear() - age;
    const syntheticBirthDate = `${birthYear}-01-01`;
    const isMinor = age < 18;

    const [existingProfile] = await db.select({ id: healthProfiles.id }).from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);
    if (!existingProfile) {
      await db.insert(healthProfiles).values({ userId, gender, birthDate: syntheticBirthDate });
    } else {
      await db.update(healthProfiles).set({ gender, birthDate: syntheticBirthDate, updatedAt: new Date() }).where(eq(healthProfiles.userId, userId));
    }

    await db.update(aivitaUsers).set({ isMinor, updatedAt: new Date() }).where(eq(aivitaUsers.id, userId));

    return c.json({ data: { ok: true, isMinor } });
  },
);

// ─── POST /parent-consent — minors only, gates card creation ────────────────

aivitaOnboardingLadderRouter.post(
  '/parent-consent',
  zValidator('json', z.object({
    parentPhone: z.string().trim().min(5).max(20),
    parentRelation: z.string().trim().min(1).max(30),
    consent: z.literal(true), // "без него карта не создаётся" — anything else is rejected
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    if (!(await assertConsentIfFlagged(userId))) return c.json({ error: 'consent_required' }, 403);
    const { parentPhone, parentRelation, consent } = c.req.valid('json');

    const [user] = await db.select({ isMinor: aivitaUsers.isMinor }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
    if (!user?.isMinor) return c.json({ error: 'not_a_minor' }, 400);

    await db.update(aivitaUsers)
      .set({ parentPhone, parentRelation, parentConsent: consent, updatedAt: new Date() })
      .where(eq(aivitaUsers.id, userId));

    return c.json({ data: { ok: true } });
  },
);

// ─── POST /q2 — height + weight ──────────────────────────────────────────────

aivitaOnboardingLadderRouter.post(
  '/q2',
  zValidator('json', z.object({
    height: z.number(),
    weight: z.number(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    if (!(await assertConsentIfFlagged(userId))) return c.json({ error: 'consent_required' }, 403);
    const { height, weight } = c.req.valid('json');

    if (!isValidHeightCm(height)) return c.json({ error: 'invalid_height', min: HEIGHT_CM_MIN, max: HEIGHT_CM_MAX }, 400);
    if (!isValidWeightKg(weight)) return c.json({ error: 'invalid_weight', min: WEIGHT_KG_MIN, max: WEIGHT_KG_MAX }, 400);

    await db.update(healthProfiles)
      .set({ heightCm: Math.round(height), weightKg: weight.toString(), updatedAt: new Date() })
      .where(eq(healthProfiles.userId, userId));

    return c.json({ data: { ok: true } });
  },
);

// ─── POST /complete — creates the medical card, marks onboarding done ───────

aivitaOnboardingLadderRouter.post('/complete', async (c) => {
  const userId = c.get('aivitaUserId');

  const [user] = await db.select().from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  if (!user) return c.json({ error: 'user_not_found' }, 404);
  if (user.isMinor && !user.parentConsent) {
    return c.json({ error: 'parent_consent_required' }, 400);
  }

  let [existingCard] = await db.select({ cardCode: medicalCards.cardCode }).from(medicalCards).where(eq(medicalCards.userId, userId)).limit(1);
  if (!existingCard) {
    const cardCode = await generateCardNumber();
    [existingCard] = await db.insert(medicalCards).values({ userId, cardCode }).returning({ cardCode: medicalCards.cardCode });
  }

  await db.update(aivitaUsers).set({ onboardingCompleted: true, updatedAt: new Date() }).where(eq(aivitaUsers.id, userId));

  return c.json({ data: { ok: true, cardCode: existingCard.cardCode } });
});

// ─── POST /anamnesis — allergies + chronic conditions, filled all at once ──
//
// Same tables Flow A's Step 3 and the survey banner both already write to
// (allergies/chronic_conditions/health_profiles.*None) — this is a third
// entry point onto the same canonical data, reachable from /medical-card
// for anyone who'd rather answer everything in one sitting instead of the
// survey banner's one-question-at-a-time pacing. Not gated by onboarding
// completion — usable any time.

const listField = z.array(z.string().trim().min(1).max(100)).max(50);

aivitaOnboardingLadderRouter.post(
  '/anamnesis',
  zValidator('json', z.object({
    allergiesList: listField.optional(),
    allergiesNone: z.boolean().optional(),
    chronicList: listField.optional(),
    chronicNone: z.boolean().optional(),
    childDiseases: z.array(z.string()).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    if (!(await assertConsentIfFlagged(userId))) return c.json({ error: 'consent_required' }, 403);
    const { allergiesList, allergiesNone, chronicList, chronicNone, childDiseases } = c.req.valid('json');

    if (allergiesList?.length) {
      await db.insert(allergies).values(
        Array.from(new Set(allergiesList)).map((a) => ({ userId, allergen: a, type: 'other' as const }))
      );
      await clearNoneFlag(userId, 'allergies');
    } else if (allergiesNone) {
      await setNoneFlag(userId, 'allergies', true);
    }

    if (chronicList?.length) {
      await db.insert(chronicConditions).values(
        Array.from(new Set(chronicList)).map((n) => ({ userId, name: n }))
      );
      await clearNoneFlag(userId, 'chronicConditions');
    } else if (chronicNone) {
      await setNoneFlag(userId, 'chronicConditions', true);
    }

    if (childDiseases) {
      await db.update(healthProfiles).set({ childDiseases, updatedAt: new Date() }).where(eq(healthProfiles.userId, userId));
    }

    return c.json({ data: { ok: true } });
  },
);
