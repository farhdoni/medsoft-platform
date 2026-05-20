import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  healthCheckups, healthProfiles, vitals,
  medications, allergies, chronicConditions,
  type CheckupSystem, type CheckupProblem, type CheckupPlanItem,
} from '@medsoft/db';
import { eq, desc, and, gte, isNull, count } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { autoReport, inferDiseaseCategory } from './outbreak.js';

export const aivitaCheckupRouter = new Hono();

aivitaCheckupRouter.use('*', requireAivitaAuth);

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CheckupResult {
  bioAge:      number;
  chronoAge:   number;
  healthScore: number;
  systems:     CheckupSystem[];
  problems:    CheckupProblem[];
  plan:        CheckupPlanItem[];
  summary:     string;
}

// ─── Mock result (used when ANTHROPIC_API_KEY is not set) ──────────────────────

function buildMock(chronoAge: number): CheckupResult {
  const bioAge = Math.max(18, chronoAge - 2 + Math.floor(Math.random() * 6));
  return {
    bioAge,
    chronoAge,
    healthScore: 72,
    systems: [
      { name: 'Сердечно-сосудистая', icon: '❤️',  score: 68, status: 'yellow', details: 'Контролируйте давление, умеренная нагрузка' },
      { name: 'Метаболизм',          icon: '🔥',  score: 81, status: 'green',  details: 'ИМТ в норме, сахар стабилен' },
      { name: 'Иммунитет',           icon: '🛡️',  score: 70, status: 'yellow', details: 'Рекомендована прививка от гриппа' },
      { name: 'Нервная система',     icon: '🧠',  score: 78, status: 'green',  details: 'Сон в норме, стресс умеренный' },
      { name: 'Опорно-двигательная', icon: '🦴',  score: 73, status: 'yellow', details: 'Рекомендуется больше движения' },
    ],
    problems: [
      {
        severity: 'yellow',
        title: 'Низкая физическая активность',
        description: 'Менее 5 000 шагов в день',
        recommendation: '30 минут ходьбы ежедневно',
      },
      {
        severity: 'yellow',
        title: 'Водный баланс',
        description: 'Недостаточное потребление воды',
        recommendation: '1,5–2 л воды в день',
      },
    ],
    plan: [
      { day: 1,  task: 'Измерить давление утром и вечером',          category: 'heart'    },
      { day: 2,  task: '30 минут прогулки',                           category: 'activity' },
      { day: 3,  task: 'Выпить не менее 8 стаканов воды',             category: 'nutrition' },
      { day: 5,  task: 'Лёгкая зарядка 15 минут',                    category: 'activity' },
      { day: 7,  task: 'Взвеситься и записать результат',             category: 'metrics'  },
      { day: 10, task: 'Добавить в рацион свежие овощи',              category: 'nutrition' },
      { day: 14, task: 'Повторное измерение давления',                category: 'heart'    },
      { day: 21, task: 'Оценить самочувствие и скорректировать план', category: 'review'   },
      { day: 30, task: 'Пройти повторный AI-чекап',                   category: 'checkup'  },
    ],
    summary: `Общее состояние удовлетворительное. Биологический возраст ${bioAge} лет — ${
      bioAge < chronoAge
        ? `на ${chronoAge - bioAge} года(-лет) моложе хронологического`
        : bioAge > chronoAge
          ? `на ${bioAge - chronoAge} года(-лет) старше хронологического`
          : 'совпадает с хронологическим'
    }. Основное внимание уделите физической активности и водному балансу.`,
  };
}

// ─── Claude API call ───────────────────────────────────────────────────────────

async function callClaude(userContext: string): Promise<CheckupResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const system = `Ты медицинский аналитик системы AIVITA Health. Анализируй данные пользователя и возвращай ТОЛЬКО валидный JSON без markdown-блоков.
Структура ответа строго:
{
  "bioAge": number,
  "chronoAge": number,
  "healthScore": number (0-100),
  "systems": [
    {"name": string, "icon": string (emoji), "score": number (0-100), "status": "green"|"yellow"|"red", "details": string}
  ],
  "problems": [
    {"severity": "red"|"yellow", "title": string, "description": string, "recommendation": string, "doctorType": string (опционально)}
  ],
  "plan": [
    {"day": number, "task": string, "category": string}
  ],
  "summary": string
}
Системы: Сердечно-сосудистая ❤️, Метаболизм 🔥, Иммунитет 🛡️, Нервная система 🧠, Опорно-двигательная 🦴.
Всегда возвращай все 5 систем. План — 7-10 пунктов (дни 1-30). Пиши по-русски. Рекомендации конкретные и измеримые.`;

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
        messages: [{ role: 'user', content: userContext }],
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { content: Array<{ type: string; text: string }> };
    const raw = data.content?.[0]?.text ?? '';

    // Strip ```json ... ``` if present
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned) as CheckupResult;
  } catch {
    return null;
  }
}

// ─── Build user context string from DB data ────────────────────────────────────

async function buildUserContext(userId: string): Promise<{ context: string; chronoAge: number; city: string }> {
  const [profile, meds, allergyList, chronic, recentVitals] = await Promise.all([
    db.query.healthProfiles.findFirst({ where: eq(healthProfiles.userId, userId) }),
    db.select().from(medications)
      .where(and(eq(medications.userId, userId), eq(medications.isActive, true), isNull(medications.deletedAt)))
      .limit(20),
    db.select().from(allergies)
      .where(and(eq(allergies.userId, userId), isNull(allergies.deletedAt)))
      .limit(20),
    db.select().from(chronicConditions)
      .where(and(eq(chronicConditions.userId, userId), isNull(chronicConditions.deletedAt)))
      .limit(20),
    db.select().from(vitals)
      .where(and(eq(vitals.userId, userId), gte(vitals.recordedAt, new Date(Date.now() - 30 * 864e5))))
      .orderBy(desc(vitals.recordedAt))
      .limit(100),
  ]);

  // Calculate age
  let chronoAge = 30;
  if (profile?.birthDate) {
    const birth = new Date(profile.birthDate);
    chronoAge = Math.floor((Date.now() - birth.getTime()) / (365.25 * 864e5));
  }

  // Aggregate vitals
  const vitalsByType: Record<string, number[]> = {};
  for (const v of recentVitals) {
    const val = (v.value as { value?: number; systolic?: number }).value
      ?? (v.value as { systolic?: number }).systolic;
    if (val != null) {
      (vitalsByType[v.type] ??= []).push(val);
    }
  }
  const avgVital = (type: string) => {
    const arr = vitalsByType[type];
    if (!arr?.length) return null;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  };

  const lines: string[] = [
    `Хронологический возраст: ${chronoAge} лет`,
    `Пол: ${profile?.gender ?? 'не указан'}`,
    `Рост: ${profile?.heightCm ?? 'не указан'} см`,
    `Вес: ${profile?.weightKg ?? 'не указан'} кг`,
    `Группа крови: ${profile?.bloodType ?? 'не указана'}`,
    `Курение: ${profile?.smokingStatus ?? 'не указано'}`,
    `Алкоголь: ${profile?.alcoholFrequency ?? 'не указано'}`,
    `Физнагрузка: ${profile?.exerciseFrequency ?? 'не указана'}`,
    `Сон: ${profile?.sleepHoursPerNight ?? 'не указан'} ч/ночь`,
    `Питание: ${profile?.nutritionType ?? 'не указано'}`,
    `Стресс: ${profile?.stressLevel ?? 'не указан'}`,
    '',
    '--- Биометрия за 30 дней ---',
    `Среднее ЧСС: ${avgVital('heart_rate') ?? 'нет данных'} уд/мин`,
    `Среднее давление (систол.): ${avgVital('blood_pressure') ?? 'нет данных'} мм рт.ст.`,
    `Средние шаги: ${avgVital('steps') ?? 'нет данных'} в день`,
    `Средний сон: ${avgVital('sleep_hours') ?? 'нет данных'} ч`,
    `Средний сахар: ${avgVital('blood_sugar') ?? 'нет данных'} мг/дл`,
    `Средний SpO2: ${avgVital('spo2') ?? 'нет данных'} %`,
    '',
    `--- Лекарства ---`,
    meds.length ? meds.map(m => `${m.name} ${m.dosage ?? ''} ${m.frequency ?? ''}`).join('; ') : 'нет активных',
    '',
    `--- Аллергии ---`,
    allergyList.length ? allergyList.map(a => `${a.allergen} (${a.type})`).join(', ') : 'нет',
    '',
    `--- Хронические заболевания ---`,
    chronic.length ? chronic.map(c => c.name).join(', ') : 'нет',
  ];

  return { context: lines.join('\n'), chronoAge, city: (profile as { city?: string } | undefined)?.city ?? 'Ташкент' };
}

// ─── POST /run ─────────────────────────────────────────────────────────────────

aivitaCheckupRouter.post('/run', async (c) => {
  const userId = c.get('aivitaUserId');

  // Enforce free-plan limit: 1 checkup per calendar month
  const session = c.get('aivitaSession');
  const plan = session?.plan ?? 'free';
  if (!plan || plan === 'free') {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [{ value: monthCount }] = await db
      .select({ value: count() })
      .from(healthCheckups)
      .where(and(eq(healthCheckups.userId, userId), gte(healthCheckups.createdAt, monthStart)));
    if (monthCount >= 1) {
      return c.json({ error: 'plan_limit' }, 429);
    }
  }

  // Insert pending record
  const [pending] = await db.insert(healthCheckups).values({
    userId,
    status: 'pending',
  }).returning();

  try {
    const { context, chronoAge, city } = await buildUserContext(userId);

    // Try Claude first, fall back to mock
    const result: CheckupResult = (await callClaude(context)) ?? buildMock(chronoAge);

    const [done] = await db.update(healthCheckups)
      .set({
        bioAge:      result.bioAge,
        chronoAge:   result.chronoAge,
        healthScore: result.healthScore,
        systems:     result.systems,
        problems:    result.problems,
        plan:        result.plan,
        summary:     result.summary,
        status:      'done',
      })
      .where(eq(healthCheckups.id, pending.id))
      .returning();

    // ── Auto-report symptoms to outbreak monitoring ──────────────────────────
    if (result.problems?.length) {
      for (const prob of result.problems) {
        if (prob.severity === 'red' || prob.severity === 'yellow') {
          void autoReport({
            userId,
            city,
            symptomType: 'headache', // generic — AI will infer exact type
            diseaseCategory: inferDiseaseCategory(prob.title, prob.description),
            severity: prob.severity === 'red' ? 'severe' : 'moderate',
            source: 'checkup',
          });
        }
      }
    }

    return c.json({ data: done }, 201);
  } catch {
    await db.update(healthCheckups)
      .set({ status: 'error' })
      .where(eq(healthCheckups.id, pending.id));
    return c.json({ error: 'Checkup failed' }, 500);
  }
});

// ─── GET /history ──────────────────────────────────────────────────────────────

aivitaCheckupRouter.get('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(healthCheckups)
    .where(eq(healthCheckups.userId, userId))
    .orderBy(desc(healthCheckups.createdAt))
    .limit(20);
  return c.json({ data: rows });
});

// ─── GET /:id ──────────────────────────────────────────────────────────────────

aivitaCheckupRouter.get('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  const row = await db.query.healthCheckups.findFirst({
    where: and(eq(healthCheckups.id, id), eq(healthCheckups.userId, userId)),
  });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});
