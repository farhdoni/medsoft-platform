import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { healthScores, systemTestResults, vitals } from '@medsoft/db';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaHealthScoreRouter = new Hono();

aivitaHealthScoreRouter.use('*', requireAivitaAuth);

// ─── Get latest score ──────────────────────────────────────────────────────────
aivitaHealthScoreRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const latest = await db.query.healthScores.findFirst({
    where: eq(healthScores.userId, userId),
    orderBy: desc(healthScores.calculatedAt),
  });
  return c.json({ data: latest ?? null });
});

// ─── History (last 30 entries) ─────────────────────────────────────────────────
aivitaHealthScoreRouter.get('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(healthScores)
    .where(eq(healthScores.userId, userId))
    .orderBy(desc(healthScores.calculatedAt))
    .limit(30);
  return c.json({ data: rows });
});

// ─── Calculate & save new score ────────────────────────────────────────────────
aivitaHealthScoreRouter.post('/calculate', async (c) => {
  const userId = c.get('aivitaUserId');

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Get latest system test results for current month
  const testResults = await db.select().from(systemTestResults)
    .where(and(
      eq(systemTestResults.userId, userId),
      eq(systemTestResults.periodMonth, currentMonth),
    ));

  const systemToCol: Record<string, keyof typeof healthScores.$inferSelect> = {
    cardiovascular: 'cardiovascularScore',
    digestive: 'digestiveScore',
    sleep: 'sleepScore',
    mental: 'mentalScore',
    musculoskeletal: 'musculoskeletalScore',
  };

  const scores = testResults.map((r) => r.score);
  const totalScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 70;

  const scoreFields: Record<string, number | undefined> = {};
  for (const r of testResults) {
    const col = systemToCol[r.system];
    if (col) scoreFields[col as string] = r.score;
  }

  const [saved] = await db.insert(healthScores).values({
    userId,
    totalScore,
    cardiovascularScore: scoreFields['cardiovascularScore'] as number | undefined,
    digestiveScore: scoreFields['digestiveScore'] as number | undefined,
    sleepScore: scoreFields['sleepScore'] as number | undefined,
    mentalScore: scoreFields['mentalScore'] as number | undefined,
    musculoskeletalScore: scoreFields['musculoskeletalScore'] as number | undefined,
    trigger: 'manual',
    calculatedAt: new Date(),
  }).returning();

  return c.json({ data: saved }, 201);
});

// ─── Vitals ────────────────────────────────────────────────────────────────────
aivitaHealthScoreRouter.get('/vitals', async (c) => {
  const userId = c.get('aivitaUserId');
  const dateFrom = c.req.query('from');
  const dateTo = c.req.query('to');
  const type = c.req.query('type');

  const conditions = [eq(vitals.userId, userId)];
  if (dateFrom) conditions.push(gte(vitals.recordedAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(vitals.recordedAt, new Date(dateTo)));
  if (type) conditions.push(eq(vitals.type, type));

  const rows = await db.select().from(vitals)
    .where(and(...conditions))
    .orderBy(desc(vitals.recordedAt))
    .limit(100);

  return c.json({ data: rows });
});

aivitaHealthScoreRouter.post(
  '/vitals',
  zValidator('json', z.object({
    type: z.string().min(1), // 'heart_rate' | 'blood_pressure' | 'sleep_hours' | 'steps' | 'water_ml' | 'weight'
    value: z.union([
      z.object({ value: z.number(), unit: z.string() }),
      z.object({ systolic: z.number(), diastolic: z.number() }),
      z.object({ hours: z.number(), quality: z.enum(['poor', 'ok', 'good']).optional() }),
    ]),
    source: z.string().optional(),
    recordedAt: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [created] = await db.insert(vitals).values({
      userId,
      type: body.type,
      value: body.value,
      source: body.source ?? 'manual',
      recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
    }).returning();

    return c.json({ data: created }, 201);
  }
);

// ─── System test results ───────────────────────────────────────────────────────
aivitaHealthScoreRouter.get('/system-tests', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(systemTestResults)
    .where(eq(systemTestResults.userId, userId))
    .orderBy(desc(systemTestResults.completedAt))
    .limit(20);
  return c.json({ data: rows });
});

aivitaHealthScoreRouter.post(
  '/system-tests',
  zValidator('json', z.object({
    periodMonth: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
    system: z.enum(['cardiovascular', 'digestive', 'sleep', 'mental', 'musculoskeletal']),
    score: z.number().int().min(0).max(100),
    answers: z.array(z.object({
      questionId: z.string(),
      questionText: z.string(),
      answer: z.any(),
      score: z.number(),
    })),
    growthZones: z.array(z.string()).optional(),
    positives: z.array(z.string()).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    // Upsert: one result per user+period+system
    const [created] = await db.insert(systemTestResults).values({
      userId,
      periodMonth: body.periodMonth,
      system: body.system,
      score: body.score,
      answers: body.answers as Array<{ questionId: string; questionText: string; answer: unknown; score: number }>,
      growthZones: body.growthZones,
      positives: body.positives,
    }).onConflictDoUpdate({
      target: [systemTestResults.userId, systemTestResults.periodMonth, systemTestResults.system],
      set: {
        score: body.score,
        answers: body.answers as Array<{ questionId: string; questionText: string; answer: unknown; score: number }>,
        growthZones: body.growthZones,
        positives: body.positives,
        completedAt: new Date(),
      },
    }).returning();

    return c.json({ data: created }, 201);
  }
);
