import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  healthProfiles,
  allergies,
  chronicConditions,
  medicalCards,
  familyMembers,
  cardClaimRequests,
  healthScores,
} from '@medsoft/db';
import { eq, and, isNull, like, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { computeHealthSnapshot, FACTOR_LABELS_RU, type HealthSnapshot } from '../../lib/health-snapshot.js';

export const aivitaOnboardingRouter = new Hono();
aivitaOnboardingRouter.use('*', requireAivitaAuth);

// ─── Onboarding Health Snapshot (the "hook") ──────────────────────────────────
// Computes a baseline Health Score from onboarding data and an AI-personalized
// insight, persists it to health_scores (trigger=onboarding), and returns the
// full payload for the result screen. AI uses claude-sonnet with a mock fallback.

type Insight = { insight: string; growthZone: string; actions: Array<{ key: string; title: string; subtitle: string }> };

async function generateSnapshotInsight(snap: HealthSnapshot, locale: string): Promise<Insight | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const lang = locale === 'uz' ? "o'zbek tilida" : locale === 'en' ? 'in English' : 'на русском';
  const system = `Ты — AI-помощник здоровья AIVITA. По метрикам пользователя верни ТОЛЬКО валидный JSON без markdown-блоков:
{"insight": string, "growthZone": string, "actions": [{"key": "sleep"|"stress"|"activity"|"nutrition"|"chat", "title": string, "subtitle": string}]}
insight: 2-3 коротких предложения, тёплый тон, обращение на «ты». Назови главную зону роста, на сколько примерно вырастет Score если её поправить, и закончи вовлекающим вопросом.
growthZone: короткий ярлык зоны роста, 1-3 слова.
actions: 2-3 конкретных шага; key соответствует слабому фактору (или "chat" для вопроса AI-доктору).
Весь текст пиши ${lang}.`;
  const user = `Score: ${snap.totalScore}/100. Реальный возраст: ${snap.realAge ?? '?'}, возраст здоровья: ${snap.healthAge ?? '?'}. Факторы 0-100 — сон ${snap.factors.sleep}, стресс ${snap.factors.stress}, активность ${snap.factors.activity}, питание ${snap.factors.nutrition}. Самые слабые: ${snap.lowestFactors.join(', ') || 'нет явных'}.`;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 700, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { content: Array<{ type: string; text: string }> };
    const raw = data.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned) as Insight;
    if (!parsed?.insight || !Array.isArray(parsed.actions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function fallbackInsight(snap: HealthSnapshot, locale: string): Insight {
  const weak = snap.lowestFactors;
  const label = (k: string) => FACTOR_LABELS_RU[k] ?? k;
  const zoneRu = weak.length ? weak.map(label).join(' и ') : 'Поддержание формы';
  const actionsByKey: Record<string, { title: string; subtitle: string }> = {
    sleep: { title: 'Настроить режим сна', subtitle: 'Персональный план на 21 день' },
    stress: { title: 'Дыхание 4-7-8', subtitle: '3 минуты перед сном' },
    activity: { title: 'Цель по шагам', subtitle: 'Трекер + мягкие напоминания' },
    nutrition: { title: 'Сбалансировать рацион', subtitle: 'Подсказки по питанию' },
  };
  const actions = (weak.length ? weak : ['sleep']).slice(0, 2).map((k) => ({ key: k, ...(actionsByKey[k] ?? actionsByKey.sleep) }));
  actions.push({ key: 'chat', title: 'Спросить AI-доктора', subtitle: 'Любой вопрос о здоровье' });
  const insight = weak.length
    ? `Твоя главная зона роста — ${zoneRu.toLowerCase()}. Если поработать над этим, Score вырастет примерно до ${Math.min(99, snap.totalScore + 10)} за несколько недель. Начнём с малого?`
    : `Отличная база — ключевые факторы в норме! Давай удержим результат и добавим лёгкие привычки. Готов начать?`;
  return { insight, growthZone: zoneRu, actions };
}

aivitaOnboardingRouter.post('/snapshot', async (c) => {
  const userId = c.get('aivitaUserId');
  const body = await c.req.json().catch(() => ({})) as { locale?: string };
  const locale = body.locale === 'uz' || body.locale === 'en' ? body.locale : 'ru';

  const [profile] = await db
    .select()
    .from(healthProfiles)
    .where(eq(healthProfiles.userId, userId))
    .limit(1);
  if (!profile) return c.json({ error: 'Health profile not found' }, 404);

  const snap = computeHealthSnapshot({
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    sleepHoursPerNight: profile.sleepHoursPerNight,
    stressLevel: profile.stressLevel,
    exerciseFrequency: profile.exerciseFrequency,
    nutritionType: profile.nutritionType,
    smokingStatus: profile.smokingStatus,
    alcoholFrequency: profile.alcoholFrequency,
  });

  const ai = (await generateSnapshotInsight(snap, locale)) ?? fallbackInsight(snap, locale);

  await db.insert(healthScores).values({
    userId,
    totalScore: snap.totalScore,
    healthAge: snap.healthAge ?? undefined,
    growthZone: ai.growthZone,
    sleepScore: snap.factors.sleep,
    mentalScore: snap.factors.stress,
    trigger: 'onboarding',
  });

  return c.json({
    data: {
      totalScore: snap.totalScore,
      realAge: snap.realAge,
      healthAge: snap.healthAge,
      factors: snap.factors,
      insight: ai.insight,
      growthZone: ai.growthZone,
      actions: ai.actions,
    },
  });
});

// ─── Card code generator (AI-{year}-{seq}) ────────────────────────────────────

async function generateCardNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `AI-${year}-%`;
  const [last] = await db
    .select({ cardCode: medicalCards.cardCode })
    .from(medicalCards)
    .where(like(medicalCards.cardCode, pattern))
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

// ─── GET /status ──────────────────────────────────────────────────────────────

aivitaOnboardingRouter.get('/status', async (c) => {
  const userId = c.get('aivitaUserId');
  const [user] = await db
    .select({
      onboardingCompleted: aivitaUsers.onboardingCompleted,
      onboardingStep: aivitaUsers.onboardingStep,
      isMinor: aivitaUsers.isMinor,
    })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.id, userId))
    .limit(1);

  const [card] = await db
    .select({ cardCode: medicalCards.cardCode })
    .from(medicalCards)
    .where(eq(medicalCards.userId, userId))
    .limit(1);

  return c.json({
    data: {
      completed: user?.onboardingCompleted ?? false,
      currentStep: user?.onboardingStep ?? 0,
      isMinor: user?.isMinor ?? false,
      cardCode: card?.cardCode ?? null,
    },
  });
});

// ─── POST /step ───────────────────────────────────────────────────────────────

const stepSchema = z.object({
  step: z.number().int().min(1).max(6),
  data: z.record(z.unknown()),
});

aivitaOnboardingRouter.post(
  '/step',
  zValidator('json', stepSchema),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { step, data } = c.req.valid('json');

    const [user] = await db
      .select()
      .from(aivitaUsers)
      .where(eq(aivitaUsers.id, userId))
      .limit(1);

    if (!user) return c.json({ error: 'User not found' }, 404);

    // Ensure health profile exists
    const [existingProfile] = await db
      .select({ id: healthProfiles.id })
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, userId))
      .limit(1);

    if (!existingProfile) {
      await db.insert(healthProfiles).values({ userId });
    }

    // ── Step 1: Personal info ─────────────────────────────────────────────────
    if (step === 1) {
      const d = data as {
        firstName?: string; lastName?: string; dateOfBirth?: string;
        gender?: string; phone?: string; city?: string;
      };

      const fullName = [d.lastName, d.firstName].filter(Boolean).join(' ') || undefined;

      await db
        .update(aivitaUsers)
        .set({ name: fullName, onboardingStep: 1, updatedAt: new Date() })
        .where(eq(aivitaUsers.id, userId));

      // Determine minor
      let isMinor = false;
      if (d.dateOfBirth) {
        const ageMs = Date.now() - new Date(d.dateOfBirth).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        isMinor = ageDays / 365.25 < 18;
      }
      await db
        .update(aivitaUsers)
        .set({ isMinor })
        .where(eq(aivitaUsers.id, userId));

      await db
        .update(healthProfiles)
        .set({
          birthDate: d.dateOfBirth || undefined,
          gender: d.gender || undefined,
          phone: d.phone || undefined,
          city: d.city || undefined,
          updatedAt: new Date(),
        })
        .where(eq(healthProfiles.userId, userId));

      return c.json({ data: { step: 1, saved: true, isMinor } });
    }

    // ── Step 2: Body metrics ─────────────────────────────────────────────────
    if (step === 2) {
      const d = data as {
        height?: number; weight?: number; bloodType?: string;
        school?: string; grade?: string; visionStatus?: string;
      };

      await db
        .update(healthProfiles)
        .set({
          heightCm: d.height || undefined,
          weightKg: d.weight != null ? String(d.weight) : undefined,
          bloodType: d.bloodType || undefined,
          school: d.school || undefined,
          grade: d.grade || undefined,
          visionStatus: d.visionStatus || undefined,
          updatedAt: new Date(),
        })
        .where(eq(healthProfiles.userId, userId));

      await db
        .update(aivitaUsers)
        .set({ onboardingStep: 2, updatedAt: new Date() })
        .where(eq(aivitaUsers.id, userId));

      return c.json({ data: { step: 2, saved: true } });
    }

    // ── Step 3: Allergies + diseases ─────────────────────────────────────────
    if (step === 3) {
      const d = data as {
        allergiesList?: string[];
        chronicList?: string[];
        childDiseases?: string[];
      };

      if (d.allergiesList?.length) {
        await db.insert(allergies).values(
          d.allergiesList.map(a => ({ userId, allergen: a, type: 'other' as const }))
        ).onConflictDoNothing();
      }
      if (d.chronicList?.length) {
        await db.insert(chronicConditions).values(
          d.chronicList.map(n => ({ userId, name: n }))
        ).onConflictDoNothing();
      }
      if (d.childDiseases) {
        await db
          .update(healthProfiles)
          .set({ childDiseases: d.childDiseases, updatedAt: new Date() })
          .where(eq(healthProfiles.userId, userId));
      }

      await db
        .update(aivitaUsers)
        .set({ onboardingStep: 3, updatedAt: new Date() })
        .where(eq(aivitaUsers.id, userId));

      return c.json({ data: { step: 3, saved: true } });
    }

    // ── Step 4: Lifestyle (adult) or Vaccinations (teen) ─────────────────────
    if (step === 4) {
      if (user.isMinor) {
        const d = data as { vaccinations?: Array<{ name: string; status: string; date?: string }> };
        await db
          .update(healthProfiles)
          .set({
            vaccinationHistory: d.vaccinations as typeof healthProfiles.$inferSelect.vaccinationHistory,
            updatedAt: new Date(),
          })
          .where(eq(healthProfiles.userId, userId));
      } else {
        const d = data as {
          smoking?: string; alcohol?: string;
          activity?: string; sleep?: string;
        };
        await db
          .update(healthProfiles)
          .set({
            smokingStatus: d.smoking || undefined,
            alcoholFrequency: d.alcohol || undefined,
            exerciseFrequency: d.activity || undefined,
            sleepHoursPerNight: d.sleep || undefined,
            updatedAt: new Date(),
          })
          .where(eq(healthProfiles.userId, userId));
      }

      await db
        .update(aivitaUsers)
        .set({ onboardingStep: 4, updatedAt: new Date() })
        .where(eq(aivitaUsers.id, userId));

      return c.json({ data: { step: 4, saved: true } });
    }

    // ── Step 5: Emergency contacts (adult) or Teen lifestyle ─────────────────
    if (step === 5) {
      if (user.isMinor) {
        const d = data as {
          activity?: string; sleep?: string;
          screenTime?: string; nutrition?: string;
        };
        await db
          .update(healthProfiles)
          .set({
            exerciseFrequency: d.activity || undefined,
            sleepHoursPerNight: d.sleep || undefined,
            screenTime: d.screenTime || undefined,
            nutritionType: d.nutrition || undefined,
            updatedAt: new Date(),
          })
          .where(eq(healthProfiles.userId, userId));
      } else {
        const d = data as {
          contactName?: string; contactPhone?: string; contactRelation?: string;
          doctorName?: string; clinic?: string;
        };
        await db
          .update(healthProfiles)
          .set({
            emergencyContactName: d.contactName || undefined,
            emergencyContactPhone: d.contactPhone || undefined,
            emergencyContactRelation: d.contactRelation || undefined,
            doctorName: d.doctorName || undefined,
            clinic: d.clinic || undefined,
            updatedAt: new Date(),
          })
          .where(eq(healthProfiles.userId, userId));
      }

      await db
        .update(aivitaUsers)
        .set({ onboardingStep: 5, updatedAt: new Date() })
        .where(eq(aivitaUsers.id, userId));

      return c.json({ data: { step: 5, saved: true } });
    }

    // ── Step 6: Complete — create card ────────────────────────────────────────
    if (step === 6) {
      if (user.isMinor) {
        const d = data as { parentPhone?: string; parentRelation?: string; consent?: boolean };
        await db
          .update(aivitaUsers)
          .set({
            parentPhone: d.parentPhone || undefined,
            parentRelation: d.parentRelation || undefined,
            parentConsent: d.consent ?? false,
          })
          .where(eq(aivitaUsers.id, userId));
      }

      // Create card with AI-YEAR-NNNNN code
      let [existingCard] = await db
        .select({ cardCode: medicalCards.cardCode })
        .from(medicalCards)
        .where(eq(medicalCards.userId, userId))
        .limit(1);

      if (!existingCard) {
        const cardCode = await generateCardNumber();
        [existingCard] = await db
          .insert(medicalCards)
          .values({ userId, cardCode })
          .returning({ cardCode: medicalCards.cardCode });
      }

      await db
        .update(aivitaUsers)
        .set({
          onboardingCompleted: true,
          onboardingStep: 6,
          updatedAt: new Date(),
        })
        .where(eq(aivitaUsers.id, userId));

      return c.json({
        data: { step: 6, saved: true, completed: true, cardCode: existingCard.cardCode },
      });
    }

    return c.json({ error: 'Invalid step' }, 400);
  }
);

// ─── GET /medical-card — full card data for /medical-card page ────────────────

aivitaOnboardingRouter.get('/medical-card', async (c) => {
  const userId = c.get('aivitaUserId');

  const [user] = await db.select().from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);
  const allergyRows = await db.select().from(allergies).where(eq(allergies.userId, userId));
  const chronicRows = await db.select().from(chronicConditions).where(eq(chronicConditions.userId, userId));

  const [card] = await db
    .select({ cardCode: medicalCards.cardCode, isActive: medicalCards.isActive, accessCount: medicalCards.accessCount, createdAt: medicalCards.createdAt })
    .from(medicalCards)
    .where(eq(medicalCards.userId, userId))
    .limit(1);

  // Completeness %
  const checkFields = [
    user?.name, profile?.birthDate, profile?.gender, profile?.phone, profile?.city,
    profile?.heightCm, profile?.weightKg, profile?.bloodType,
    allergyRows.length > 0, chronicRows.length > 0,
    profile?.smokingStatus, profile?.exerciseFrequency,
    profile?.emergencyContactName, profile?.emergencyContactPhone,
  ];
  const filled = checkFields.filter(f => f != null && f !== '').length;
  const completionPercent = Math.round((filled / checkFields.length) * 100);

  return c.json({
    data: {
      card,
      completionPercent,
      isMinor: user?.isMinor ?? false,
      personal: {
        name: user?.name,
        email: user?.email,
        dateOfBirth: profile?.birthDate,
        gender: profile?.gender,
        phone: profile?.phone,
        city: profile?.city,
        pinfl: profile?.pinfl,
      },
      body: {
        height: profile?.heightCm,
        weight: profile?.weightKg,
        bloodType: profile?.bloodType,
      },
      allergies: allergyRows,
      chronicConditions: chronicRows,
      lifestyle: {
        smoking: profile?.smokingStatus,
        alcohol: profile?.alcoholFrequency,
        activity: profile?.exerciseFrequency,
        sleep: profile?.sleepHoursPerNight,
        diet: profile?.dietType,
        nutrition: profile?.nutritionType,
      },
      emergency: {
        name: profile?.emergencyContactName,
        phone: profile?.emergencyContactPhone,
        relation: profile?.emergencyContactRelation,
      },
      doctor: {
        name: profile?.doctorName,
        phone: profile?.doctorPhone,
        clinic: profile?.clinic,
      },
      insurance: {
        company: profile?.insuranceCompany,
        number: profile?.insuranceNumber,
        expires: profile?.insuranceExpires,
        hotline: profile?.insuranceHotline,
      },
      teen: user?.isMinor ? {
        school: profile?.school,
        grade: profile?.grade,
        visionStatus: profile?.visionStatus,
        childDiseases: profile?.childDiseases,
        vaccinationHistory: profile?.vaccinationHistory,
        screenTime: profile?.screenTime,
      } : null,
    },
  });
});

// ─── Claim a child card during onboarding ─────────────────────────────────────

aivitaOnboardingRouter.post(
  '/claim-card',
  zValidator('json', z.object({ cardNumber: z.string().min(1) })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { cardNumber } = c.req.valid('json');

    // Find the child family member by card number
    const [member] = await db
      .select({
        id: familyMembers.id,
        ownerId: familyMembers.ownerId,
        memberName: familyMembers.memberName,
        memberBirthDate: familyMembers.memberBirthDate,
        migratedToUserId: familyMembers.migratedToUserId,
      })
      .from(familyMembers)
      .where(and(
        eq(familyMembers.cardNumber!, cardNumber.trim().toUpperCase()),
        isNull(familyMembers.deletedAt),
      ))
      .limit(1);

    if (!member) return c.json({ error: 'not_found' }, 404);
    if (member.migratedToUserId) return c.json({ error: 'already_migrated' }, 409);

    // Check if claim request already exists
    const [existing] = await db
      .select({ id: cardClaimRequests.id })
      .from(cardClaimRequests)
      .where(and(
        eq(cardClaimRequests.fromUserId, userId),
        eq(cardClaimRequests.familyMemberId, member.id),
        eq(cardClaimRequests.status, 'pending'),
      ))
      .limit(1);

    if (existing) return c.json({ data: { already_sent: true, memberName: member.memberName } });

    const [created] = await db.insert(cardClaimRequests).values({
      fromUserId: userId,
      familyMemberId: member.id,
      parentUserId: member.ownerId,
      status: 'pending',
    }).returning();

    return c.json({ data: { id: created.id, memberName: member.memberName, sent: true } }, 201);
  }
);
