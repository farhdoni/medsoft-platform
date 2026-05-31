import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { symptomSessions } from '@medsoft/db';
import { eq, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { cachedAI } from '../../lib/ai-cache.js';

export const symptomCheckerRouter = new Hono();

symptomCheckerRouter.use('*', requireAivitaAuth);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SymptomResult {
  condition: string;
  probability: 'high' | 'medium' | 'low';
  description: string;
  specialist: string;
  urgency: 'routine' | 'soon' | 'urgent';
}

interface ClaudeQuestionResponse {
  question: string;
  options: string[];
  isLast: boolean;
  results?: SymptomResult[];
}

// ─── Claude helper ───────────────────────────────────────────────────────────

async function callClaudeSymptom(
  mainSymptom: string,
  bodyArea: string | undefined,
  age: number,
  gender: string,
  answers: Array<{ question: string; answer: string }>,
  step: number,
): Promise<ClaudeQuestionResponse | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return buildMockQuestion(step);

  const answersText = answers.length > 0
    ? answers.map((a, i) => `Вопрос ${i + 1}: "${a.question}" → "${a.answer}"`).join('\n')
    : 'Нет';

  const isLastStep = step >= 6;

  const system = `Ты опытный врач-диагност AIVITA. Пациент: возраст ${age} лет, пол ${gender}.
Симптом: "${mainSymptom}". Область тела: "${bodyArea ?? 'не указана'}".
Предыдущие ответы:\n${answersText}

${isLastStep ? `Это финальный шаг (${step}/8). Верни JSON с результатами анализа.` : `Это шаг ${step}/8. Задай следующий уточняющий вопрос.`}

Верни ТОЛЬКО валидный JSON без markdown-блоков:
${isLastStep ? `{
  "question": "Спасибо за ответы. Анализирую...",
  "options": [],
  "isLast": true,
  "results": [
    {
      "condition": "Название состояния",
      "probability": "high|medium|low",
      "description": "Краткое описание 1-2 предложения",
      "specialist": "Тип врача",
      "urgency": "routine|soon|urgent"
    }
  ]
}` : `{
  "question": "Следующий вопрос",
  "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
  "isLast": false
}`}

Пиши по-русски. Давай 3-5 возможных состояний в results. Вопросы конкретные и понятные пациенту.`;

  const cacheKey = `ai:symptom:v1:${mainSymptom.toLowerCase().trim()}|${(bodyArea ?? '').toLowerCase().trim()}|a${age}|${gender}|s${step}|${answers.map((a) => a.answer).join('>')}`;
  const cached = await cachedAI<ClaudeQuestionResponse>(cacheKey, 60 * 60 * 24 * 14, async () => {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          messages: [{ role: 'user', content: system }],
        }),
      });

      if (!resp.ok) return null;
      const data = await resp.json() as { content: Array<{ type: string; text: string }> };
      const raw = data.content?.[0]?.text ?? '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(cleaned) as ClaudeQuestionResponse;
    } catch {
      return null;
    }
  });
  return cached ?? buildMockQuestion(step);
}

function buildMockQuestion(step: number): ClaudeQuestionResponse {
  const questions: ClaudeQuestionResponse[] = [
    { question: 'Как давно появились симптомы?', options: ['Сегодня', 'Несколько дней', 'Неделю', 'Месяц и более'], isLast: false },
    { question: 'Насколько сильно беспокоит?', options: ['Слабо — терпимо', 'Умеренно', 'Сильно', 'Невыносимо'], isLast: false },
    { question: 'Есть ли повышенная температура?', options: ['Нет', 'До 37.5°C', '37.5–38.5°C', 'Выше 38.5°C'], isLast: false },
    { question: 'Были ли подобные симптомы раньше?', options: ['Никогда', 'Редко', 'Периодически', 'Постоянно'], isLast: false },
    { question: 'Принимаете ли лекарства сейчас?', options: ['Нет', 'Да, обезболивающие', 'Да, хронические', 'Да, другие'], isLast: false },
    {
      question: 'Спасибо за ответы. Анализирую...',
      options: [],
      isLast: true,
      results: [
        { condition: 'Острое респираторное заболевание', probability: 'high', description: 'Вирусная инфекция верхних дыхательных путей. Часто сопровождается слабостью и насморком.', specialist: 'Терапевт', urgency: 'soon' },
        { condition: 'Функциональное расстройство', probability: 'medium', description: 'Состояние, связанное со стрессом или переутомлением. Требует наблюдения.', specialist: 'Терапевт', urgency: 'routine' },
        { condition: 'Вирусная инфекция', probability: 'low', description: 'Возможна вирусная природа симптомов. Необходимо исключить серьёзные причины.', specialist: 'Инфекционист', urgency: 'soon' },
      ],
    },
  ];
  return questions[Math.min(step - 1, questions.length - 1)];
}

// ─── POST /symptom-checker/start ─────────────────────────────────────────────

symptomCheckerRouter.post(
  '/start',
  zValidator('json', z.object({
    mainSymptom: z.string().min(1).max(200),
    bodyArea:    z.string().max(50).optional(),
    age:         z.number().int().min(1).max(120).optional().default(30),
    gender:      z.string().optional().default('не указан'),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { mainSymptom, bodyArea, age, gender } = c.req.valid('json');

    const aiResponse = await callClaudeSymptom(mainSymptom, bodyArea, age, gender, [], 1);
    if (!aiResponse) return c.json({ error: 'AI unavailable' }, 503);

    const [session] = await db.insert(symptomSessions).values({
      userId,
      mainSymptom,
      bodyArea,
      answers: [],
    }).returning();

    return c.json({
      data: {
        sessionId: session.sessionId,
        question:  aiResponse.question,
        options:   aiResponse.options,
        step:      1,
        totalSteps: 8,
        isLast:    aiResponse.isLast,
        results:   aiResponse.results,
      },
    }, 201);
  }
);

// ─── POST /symptom-checker/answer ────────────────────────────────────────────

symptomCheckerRouter.post(
  '/answer',
  zValidator('json', z.object({
    sessionId: z.string().uuid(),
    question:  z.string(),
    answer:    z.string(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { sessionId, question, answer } = c.req.valid('json');

    const [session] = await db.select()
      .from(symptomSessions)
      .where(eq(symptomSessions.sessionId, sessionId))
      .limit(1);

    if (!session || session.userId !== userId) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const prevAnswers = (session.answers ?? []) as Array<{ question: string; answer: string }>;
    const newAnswers = [...prevAnswers, { question, answer }];
    const step = newAnswers.length + 1;

    const aiResponse = await callClaudeSymptom(
      session.mainSymptom,
      session.bodyArea ?? undefined,
      30, 'не указан',
      newAnswers,
      step,
    );

    if (!aiResponse) return c.json({ error: 'AI unavailable' }, 503);

    // Save updated answers (and results if final)
    await db.update(symptomSessions)
      .set({
        answers: newAnswers,
        ...(aiResponse.isLast && aiResponse.results ? { results: aiResponse.results } : {}),
      })
      .where(eq(symptomSessions.id, session.id));

    return c.json({
      data: {
        sessionId,
        question:   aiResponse.question,
        options:    aiResponse.options,
        step,
        totalSteps: 8,
        isLast:     aiResponse.isLast,
        results:    aiResponse.results,
      },
    });
  }
);

// ─── GET /symptom-checker/history ────────────────────────────────────────────

symptomCheckerRouter.get('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select()
    .from(symptomSessions)
    .where(eq(symptomSessions.userId, userId))
    .orderBy(desc(symptomSessions.createdAt))
    .limit(10);
  return c.json({ data: rows });
});
