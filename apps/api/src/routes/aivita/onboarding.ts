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
} from '@medsoft/db';
import { eq, like, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaOnboardingRouter = new Hono();
aivitaOnboardingRouter.use('*', requireAivitaAuth);

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
