/**
 * AI Predictive Medicine — health analysis route.
 * POST /health-analysis/run   → run a new analysis (or return cached if < 7 days old)
 * GET  /health-analysis/latest → fetch the most recent analysis
 * PUT  /health-analysis/:id/progress → update plan_progress checklist
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  healthAnalysis, healthProfiles, vitals, habits, habitLogs,
  chronicConditions, allergies, labResults,
} from '@medsoft/db';
import { eq, desc, and, gte } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { logger } from '../../lib/logger.js';

export const healthAnalysisRouter = new Hono();
healthAnalysisRouter.use('*', requireAivitaAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gatherPatientContext(userId: string): Promise<string> {
  const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);
  const latestVitals = await db.select().from(vitals)
    .where(eq(vitals.userId, userId))
    .orderBy(desc(vitals.recordedAt))
    .limit(20);
  const conditions = await db.select().from(chronicConditions).where(eq(chronicConditions.userId, userId));
  const allergyList = await db.select().from(allergies).where(eq(allergies.userId, userId));
  const labList = await db.select().from(labResults)
    .where(eq(labResults.userId, userId))
    .orderBy(desc(labResults.testedAt))
    .limit(10);
  const activeHabits = await db.select().from(habits).where(eq(habits.userId, userId));

  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / 31557600000)
    : null;

  return JSON.stringify({
    profile: {
      age,
      gender: profile?.gender,
      bloodType: profile?.bloodType,
      heightCm: profile?.heightCm,
      weightKg: profile?.weightKg,
      smokingStatus: profile?.smokingStatus,
      alcoholFrequency: profile?.alcoholFrequency,
      exerciseFrequency: profile?.exerciseFrequency,
      stressLevel: profile?.stressLevel,
      dietType: profile?.dietType,
    },
    vitals: latestVitals.map((v) => ({ type: v.type, value: v.value, recordedAt: v.recordedAt })),
    chronicConditions: conditions.map((c) => c.name),
    allergies: allergyList.map((a) => a.allergen),
    labResults: labList.map((l) => ({
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      status: l.status,
      date: l.testedAt,
    })),
    habits: activeHabits.map((h) => ({ name: h.name, category: h.category, goalValue: h.goalValue, goalUnit: h.goalUnit })),
  }, null, 2);
}

async function runClaudeAnalysis(context: string): Promise<{
  healthScore: number;
  biologicalAge: number | null;
  overallAssessment: string;
  currentProblems: Array<{
    title: string; description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string; recommendation: string; suggestedDoctor?: string;
  }>;
  futureRisks: Array<{
    title: string; probability: 'low' | 'medium' | 'high';
    timeframe: string; preventionPlan: string;
  }>;
  healthPlan: {
    duration: string;
    goals: Array<{ title: string; description: string; metric: string; target: string }>;
    dailyActions: string[];
    weeklyActions: string[];
    monthlyActions: string[];
  };
} | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const system = `Ты — AI-врач превентивной медицины AIVITA. На основе данных пациента проведи комплексный анализ здоровья.

Верни ТОЛЬКО валидный JSON без markdown-блоков со следующей структурой:
{
  "healthScore": <число 0-100>,
  "biologicalAge": <число или null>,
  "overallAssessment": "<краткая оценка 2-3 предложения>",
  "currentProblems": [
    {
      "title": "<название проблемы>",
      "description": "<описание>",
      "severity": "low|medium|high|critical",
      "category": "<категория: сердечно-сосудистая|метаболическая|психическая|опорно-двигательная|дыхательная|эндокринная|общая>",
      "recommendation": "<конкретная рекомендация>",
      "suggestedDoctor": "<специальность врача, если нужен>"
    }
  ],
  "futureRisks": [
    {
      "title": "<название риска>",
      "probability": "low|medium|high",
      "timeframe": "<временной горизонт, напр. 5-10 лет>",
      "preventionPlan": "<план профилактики>"
    }
  ],
  "healthPlan": {
    "duration": "30 дней",
    "goals": [
      {
        "title": "<цель>",
        "description": "<описание>",
        "metric": "<метрика для измерения>",
        "target": "<целевое значение>"
      }
    ],
    "dailyActions": ["<действие 1>", "<действие 2>"],
    "weeklyActions": ["<действие 1>"],
    "monthlyActions": ["<действие 1>"]
  }
}

Правила:
- healthScore: 100 = идеальное здоровье, 0 = критическое состояние
- Будь конкретным и практичным
- Учитывай возраст, пол, образ жизни
- При недостаточных данных — укажи это в overallAssessment и рекомендуй обследования
- Все тексты на русском языке`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system,
        messages: [
          {
            role: 'user',
            content: `Вот данные о здоровье пациента:\n\n${context}\n\nПроведи полный анализ и верни JSON.`,
          },
        ],
      }),
    });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, '[HealthAnalysis] Claude API error');
      return null;
    }
    const data = await resp.json() as { content: Array<{ type: string; text: string }> };
    const raw = data.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn({ err }, '[HealthAnalysis] Claude parse error');
    return null;
  }
}

// ─── POST /health-analysis/run ────────────────────────────────────────────────
healthAnalysisRouter.post('/run', async (c) => {
  const userId = c.get('aivitaUserId');

  // Check cache: if analysis exists within 7 days, return it
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const [cached] = await db.select().from(healthAnalysis)
    .where(and(
      eq(healthAnalysis.userId, userId),
      gte(healthAnalysis.createdAt, sevenDaysAgo)
    ))
    .orderBy(desc(healthAnalysis.createdAt))
    .limit(1);

  if (cached) {
    return c.json({ data: cached, fromCache: true });
  }

  // Gather patient context and run analysis
  const context = await gatherPatientContext(userId);
  const result = await runClaudeAnalysis(context);

  if (!result) {
    // Fallback: minimal analysis when Claude unavailable
    const fallback = {
      userId,
      healthScore: 70,
      biologicalAge: null,
      overallAssessment: 'Для полного анализа необходимо больше данных. Пожалуйста, заполните профиль здоровья и добавьте показатели.',
      currentProblems: [] as typeof healthAnalysis.$inferInsert['currentProblems'],
      futureRisks: [] as typeof healthAnalysis.$inferInsert['futureRisks'],
      healthPlan: {
        duration: '30 дней',
        goals: [{ title: 'Заполнить профиль здоровья', description: 'Добавьте основные данные о здоровье', metric: 'полнота профиля', target: '100%' }],
        dailyActions: ['Измерять давление', 'Следить за шагами'],
        weeklyActions: ['Сдать анализы крови'],
        monthlyActions: ['Посетить врача'],
      },
    };
    const [inserted] = await db.insert(healthAnalysis).values(fallback).returning();
    return c.json({ data: inserted, fromCache: false });
  }

  const [inserted] = await db.insert(healthAnalysis).values({
    userId,
    healthScore: result.healthScore,
    biologicalAge: result.biologicalAge ?? null,
    overallAssessment: result.overallAssessment,
    currentProblems: result.currentProblems,
    futureRisks: result.futureRisks,
    healthPlan: result.healthPlan,
    planProgress: {},
  }).returning();

  return c.json({ data: inserted, fromCache: false });
});

// ─── GET /health-analysis/latest ──────────────────────────────────────────────
healthAnalysisRouter.get('/latest', async (c) => {
  const userId = c.get('aivitaUserId');
  const [row] = await db.select().from(healthAnalysis)
    .where(eq(healthAnalysis.userId, userId))
    .orderBy(desc(healthAnalysis.createdAt))
    .limit(1);
  return c.json({ data: row ?? null });
});

// ─── PUT /health-analysis/:id/progress ────────────────────────────────────────
healthAnalysisRouter.put(
  '/:id/progress',
  zValidator('json', z.object({ progress: z.record(z.string(), z.boolean()) })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const id = c.req.param('id');
    const { progress } = c.req.valid('json');

    const [row] = await db.select({ planProgress: healthAnalysis.planProgress })
      .from(healthAnalysis)
      .where(and(eq(healthAnalysis.id, id), eq(healthAnalysis.userId, userId)))
      .limit(1);

    if (!row) return c.json({ error: 'Not found' }, 404);

    const merged = { ...(row.planProgress ?? {}), ...progress };
    const [updated] = await db.update(healthAnalysis)
      .set({ planProgress: merged })
      .where(and(eq(healthAnalysis.id, id), eq(healthAnalysis.userId, userId)))
      .returning();

    return c.json({ data: updated });
  }
);
