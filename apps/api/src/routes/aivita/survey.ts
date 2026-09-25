import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { healthProfiles, chronicConditions, allergies, medications } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { clearNoneFlag, setNoneFlag } from '../../lib/medical-card-completion.js';
import {
  getNextSurveyQuestion,
  recordSurveySkip,
  recordSurveyAnswered,
  isSurveyField,
  canonicalizeBloodType,
  isValidHeightCm,
  isValidWeightKg,
  isValidEnumAnswer,
  HEIGHT_CM_MIN,
  HEIGHT_CM_MAX,
  WEIGHT_KG_MIN,
  WEIGHT_KG_MAX,
  SURVEY_FIELD_DEFS,
  type SurveyChannel,
  type SurveyField,
} from '../../lib/survey-queue.js';

export const surveyRouter = new Hono();

surveyRouter.use('*', requireAivitaAuth);

// ─── POST /next ──────────────────────────────────────────────────────────────

surveyRouter.post(
  '/next',
  rateLimit('survey-next', 60, 300),
  zValidator('json', z.object({ channel: z.enum(['banner', 'chat']) })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { channel } = c.req.valid('json');
    const next = await getNextSurveyQuestion(userId, channel as SurveyChannel);
    return c.json({ data: next });
  },
);

// ─── POST /skip ──────────────────────────────────────────────────────────────

surveyRouter.post(
  '/skip',
  rateLimit('survey-skip', 30, 300),
  zValidator('json', z.object({
    field: z.string(),
    channel: z.enum(['banner', 'chat']),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { field, channel } = c.req.valid('json');
    if (!isSurveyField(field)) return c.json({ error: 'unknown_field' }, 400);
    await recordSurveySkip(userId, field, channel as SurveyChannel);
    return c.json({ data: { ok: true } });
  },
);

// ─── POST /answer ────────────────────────────────────────────────────────────
//
// userId is read only from the authenticated session (requireAivitaAuth,
// above) — there is no client-suppliable id anywhere in this route, so a
// request can never write to another patient's profile.

const answerBodySchema = z.object({
  field: z.string(),
  value: z.unknown().optional(),
  none: z.boolean().optional(),
  channel: z.enum(['banner', 'chat']).default('banner'),
});

// Fields where "none" has a real meaning ("нет аллергий" / "не принимаю" /
// "не знаю группу крови") and closes the field via the answered event alone,
// with nothing to write into its data table. heightCm/weightKg and the enum
// fields have no such "nothing to report" state — [Позже] is how those get
// deferred, not a "none" answer.
const NONE_ALLOWED_FIELDS = new Set<SurveyField>(['allergies', 'chronicDiseases', 'medications', 'bloodType']);

async function upsertHealthProfile(userId: string, patch: Record<string, unknown>) {
  const existing = await db.query.healthProfiles.findFirst({ where: eq(healthProfiles.userId, userId) });
  if (existing) {
    await db.update(healthProfiles).set({ ...patch, updatedAt: new Date() }).where(eq(healthProfiles.userId, userId));
  } else {
    await db.insert(healthProfiles).values({ userId, ...patch });
  }
}

surveyRouter.post(
  '/answer',
  rateLimit('survey-answer', 30, 300),
  zValidator('json', answerBodySchema),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const { field, channel } = body;

    if (!isSurveyField(field)) return c.json({ error: 'unknown_field' }, 400);
    const def = SURVEY_FIELD_DEFS[field];

    if (body.none) {
      if (!NONE_ALLOWED_FIELDS.has(field)) {
        return c.json({ error: 'none_not_allowed_for_field' }, 400);
      }
      // Allergies / chronic: «нет» is a real answer about the person and is
      // stored as such (health_profiles.*_none) — the medical-card
      // completion counts it. Medications / blood type: the answered event
      // alone closes the field (see survey-queue.ts's everAnswered check).
      if (field === 'allergies') await setNoneFlag(userId, 'allergies', true);
      if (field === 'chronicDiseases') await setNoneFlag(userId, 'chronicConditions', true);
      await recordSurveyAnswered(userId, field, channel as SurveyChannel);
      return c.json({ data: { ok: true, field, none: true } });
    }

    if (field === 'medications') {
      // "Принимаю" never reaches this endpoint with a value — the client
      // navigates to the existing medications screen instead, and the field
      // closes naturally once a real active medication row exists (see
      // fetchFilledState in survey-queue.ts). Nothing valid to answer here.
      return c.json({ error: 'medications_answer_via_medications_screen' }, 400);
    }

    if (body.value === undefined) return c.json({ error: 'value_required' }, 400);

    switch (def.type) {
      case 'list': {
        const parsed = z.array(z.string().trim().min(1).max(100)).min(1).safeParse(body.value);
        if (!parsed.success) return c.json({ error: 'invalid_value', details: parsed.error.issues }, 400);
        const items = Array.from(new Set(parsed.data)); // dedup
        if (field === 'allergies') {
          await db.insert(allergies).values(items.map((allergen) => ({ userId, allergen, type: 'other' as const })));
          await clearNoneFlag(userId, 'allergies');
        } else if (field === 'chronicDiseases') {
          await db.insert(chronicConditions).values(items.map((name) => ({ userId, name })));
          await clearNoneFlag(userId, 'chronicConditions');
        }
        break;
      }

      case 'number': {
        const parsed = z.number().safeParse(body.value);
        if (!parsed.success) return c.json({ error: 'invalid_value' }, 400);
        if (field === 'heightCm') {
          const n = parsed.data;
          if (!isValidHeightCm(n)) return c.json({ error: 'out_of_range', min: HEIGHT_CM_MIN, max: HEIGHT_CM_MAX }, 400);
          await upsertHealthProfile(userId, { heightCm: Math.round(n) });
        } else if (field === 'weightKg') {
          const n = parsed.data;
          if (!isValidWeightKg(n)) return c.json({ error: 'out_of_range', min: WEIGHT_KG_MIN, max: WEIGHT_KG_MAX }, 400);
          // health_profiles.weight_kg is numeric — the existing PUT /health-profile
          // endpoint also takes/stores this as a string, matched here.
          await upsertHealthProfile(userId, { weightKg: n.toString() });
        }
        break;
      }

      case 'blood_type': {
        const parsed = z.string().safeParse(body.value);
        if (!parsed.success) return c.json({ error: 'invalid_value' }, 400);
        const canonical = canonicalizeBloodType(parsed.data);
        if (!canonical) return c.json({ error: 'invalid_blood_type' }, 400);
        await upsertHealthProfile(userId, { bloodType: canonical });
        break;
      }

      case 'enum': {
        const parsed = z.string().safeParse(body.value);
        if (!parsed.success || !isValidEnumAnswer(field, parsed.data)) {
          return c.json({ error: 'invalid_value', allowed: (def.options ?? []).map((o) => o.value) }, 400);
        }
        if (field === 'smokingStatus') await upsertHealthProfile(userId, { smokingStatus: parsed.data });
        else if (field === 'alcohol') await upsertHealthProfile(userId, { alcoholFrequency: parsed.data });
        else if (field === 'activity') await upsertHealthProfile(userId, { exerciseFrequency: parsed.data });
        else if (field === 'gender') await upsertHealthProfile(userId, { gender: parsed.data });
        break;
      }

      case 'text': {
        // Phone fields get a loose format check (digits/+/spaces/dashes,
        // 7-20 chars) — everything else is just a non-empty trimmed string,
        // same bound as the 'list' case above.
        const isPhoneField = field === 'emergencyContactPhone' || field === 'phone';
        const schema = isPhoneField
          ? z.string().trim().regex(/^[+\d][\d\s()-]{6,19}$/)
          : z.string().trim().min(1).max(200);
        const parsed = schema.safeParse(body.value);
        if (!parsed.success) return c.json({ error: 'invalid_value' }, 400);
        if (field === 'emergencyContactPhone') await upsertHealthProfile(userId, { emergencyContactPhone: parsed.data });
        else if (field === 'phone') await upsertHealthProfile(userId, { phone: parsed.data });
        else if (field === 'city') await upsertHealthProfile(userId, { city: parsed.data });
        else if (field === 'doctorName') await upsertHealthProfile(userId, { doctorName: parsed.data });
        else if (field === 'clinic') await upsertHealthProfile(userId, { clinic: parsed.data });
        break;
      }

      default:
        return c.json({ error: 'unsupported_field_type' }, 400);
    }

    await recordSurveyAnswered(userId, field, channel as SurveyChannel);
    return c.json({ data: { ok: true, field } });
  },
);
