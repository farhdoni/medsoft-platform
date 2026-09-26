import { db } from '@medsoft/db';
import { medicalCards, healthCheckups, userDevices, labResults } from '@medsoft/db';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * The 4-stage roadmap from Start.dc.html (Анкета/Чекап/Гаджеты/Обследования),
 * measured by what's actually saved — not aivita_users.onboarding_step. A raw
 * counter already proved unreliable (fix/onboarding-flow-b-removal: 3 real
 * accounts ended up onboardingCompleted=true with onboarding_step stuck at
 * 0), and Part B's ladder deliberately never writes it. Home's "on a
 * pause"/"empty" states need the exact same 4-stage picture the ladder
 * itself uses for its own progress bar (Q1/Q2/Step2/Step3/Step4) — this is
 * that single shared source, used by both onboarding-ladder.ts's /status
 * and the new home-state endpoint, so they can never quietly disagree.
 */
export interface OnboardingProgress {
  /** A medical card exists — the Q1→Q2→Done1 stage is complete. */
  hasCard: boolean;
  stages: {
    questionnaire: boolean;
    checkup: boolean;
    gadgets: boolean;
    documents: boolean;
  };
  /** 0-4, count of `stages` that are true. */
  stagesDone: number;
}

export async function getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
  const [card] = await db.select({ id: medicalCards.id }).from(medicalCards).where(eq(medicalCards.userId, userId)).limit(1);
  const [checkup] = await db.select({ id: healthCheckups.id }).from(healthCheckups)
    .where(and(eq(healthCheckups.userId, userId), eq(healthCheckups.status, 'done'))).limit(1);
  const [device] = await db.select({ id: userDevices.id }).from(userDevices)
    .where(and(eq(userDevices.userId, userId), eq(userDevices.status, 'connected'))).limit(1);
  const [doc] = await db.select({ id: labResults.id }).from(labResults)
    .where(and(eq(labResults.userId, userId), isNull(labResults.deletedAt))).limit(1);

  const stages = {
    questionnaire: !!card,
    checkup: !!checkup,
    gadgets: !!device,
    documents: !!doc,
  };

  return {
    hasCard: !!card,
    stages,
    stagesDone: Object.values(stages).filter(Boolean).length,
  };
}
