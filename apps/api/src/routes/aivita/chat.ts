import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { chatSessions, chatMessages, healthScores, healthProfiles } from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaChatRouter = new Hono();

aivitaChatRouter.use('*', requireAivitaAuth);

// ─── List sessions ─────────────────────────────────────────────────────────────
aivitaChatRouter.get('/sessions', async (c) => {
  const userId = c.get('aivitaUserId');
  const sessions = await db.select().from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(20);
  return c.json({ data: sessions });
});

// ─── Create session ────────────────────────────────────────────────────────────
aivitaChatRouter.post(
  '/sessions',
  zValidator('json', z.object({
    title: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const [session] = await db.insert(chatSessions).values({
      userId,
      title: body.title ?? 'Новый чат',
    }).returning();
    return c.json({ data: session }, 201);
  }
);

// ─── Close session (set status = 'archived') ───────────────────────────────────
aivitaChatRouter.patch('/sessions/:sessionId/archive', async (c) => {
  const userId = c.get('aivitaUserId');
  const { sessionId } = c.req.param();
  const [updated] = await db.update(chatSessions)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .returning();
  if (!updated) return c.json({ error: 'Session not found' }, 404);
  return c.json({ data: updated });
});

// ─── Get messages ──────────────────────────────────────────────────────────────
aivitaChatRouter.get('/sessions/:sessionId/messages', async (c) => {
  const userId = c.get('aivitaUserId');
  const { sessionId } = c.req.param();
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const session = await db.query.chatSessions.findFirst({
    where: and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)),
  });
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const messages = await db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt)
    .limit(limit)
    .offset(offset);

  return c.json({ data: messages });
});

// ─── Send message (user → auto AI reply) ──────────────────────────────────────
aivitaChatRouter.post(
  '/sessions/:sessionId/messages',
  zValidator('json', z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1),
    aiMetadata: z.record(z.unknown()).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { sessionId } = c.req.param();
    const body = c.req.valid('json');

    const session = await db.query.chatSessions.findFirst({
      where: and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)),
    });
    if (!session) return c.json({ error: 'Session not found' }, 404);

    const [message] = await db.insert(chatMessages).values({
      sessionId,
      role: body.role,
      content: body.content,
      aiMetadata: body.aiMetadata,
    }).returning();

    // Update session timestamp
    await db.update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));

    // Auto-generate mock AI response for user messages
    if (body.role === 'user') {
      // Fetch user's health context for personalised responses
      const [latestScore, healthProfile] = await Promise.all([
        db.query.healthScores.findFirst({
          where: eq(healthScores.userId, userId),
          orderBy: desc(healthScores.calculatedAt),
        }).catch(() => null),
        db.query.healthProfiles.findFirst({
          where: eq(healthProfiles.userId, userId),
        }).catch(() => null),
      ]);

      const aiContent = generateMockAiResponse(body.content, latestScore ?? null, healthProfile ?? null);
      const quickReplies = getQuickReplies(body.content);

      const [aiMessage] = await db.insert(chatMessages).values({
        sessionId,
        role: 'assistant',
        content: aiContent,
        aiMetadata: {
          type: 'info',
          quick_replies: quickReplies,
        },
      }).returning();

      return c.json({ data: { userMessage: message, aiMessage } }, 201);
    }

    return c.json({ data: { message } }, 201);
  }
);

function buildHealthContext(
  score: { totalScore: number; cardiovascularScore?: number | null; sleepScore?: number | null; mentalScore?: number | null; digestiveScore?: number | null; musculoskeletalScore?: number | null } | null,
  profile: { bloodType?: string | null; heightCm?: number | null; weightKg?: string | null } | null,
): string {
  if (!score && !profile) return '';

  const parts: string[] = [];

  if (score) {
    parts.push(`Health Score пользователя: ${score.totalScore}/100`);
    const systems = [
      score.cardiovascularScore != null && `Сердце: ${score.cardiovascularScore}`,
      score.digestiveScore != null && `ЖКТ: ${score.digestiveScore}`,
      score.sleepScore != null && `Сон: ${score.sleepScore}`,
      score.mentalScore != null && `Психо: ${score.mentalScore}`,
      score.musculoskeletalScore != null && `ОДА: ${score.musculoskeletalScore}`,
    ].filter(Boolean);
    if (systems.length) parts.push(`Системы: ${systems.join(', ')}`);

    // Flag weak systems for context
    const weak: string[] = [];
    if (score.sleepScore != null && score.sleepScore < 60) weak.push('сон');
    if (score.mentalScore != null && score.mentalScore < 60) weak.push('стресс');
    if (score.cardiovascularScore != null && score.cardiovascularScore < 60) weak.push('сердечно-сосудистая система');
    if (score.digestiveScore != null && score.digestiveScore < 60) weak.push('пищеварение');
    if (score.musculoskeletalScore != null && score.musculoskeletalScore < 60) weak.push('опорно-двигательный аппарат');
    if (weak.length) parts.push(`Слабые зоны: ${weak.join(', ')}`);
  }

  if (profile) {
    if (profile.heightCm && profile.weightKg) {
      const weight = parseFloat(profile.weightKg);
      const bmi = Math.round(weight / ((profile.heightCm / 100) ** 2));
      parts.push(`ИМТ: ${bmi}`);
    }
    if (profile.bloodType) parts.push(`Группа крови: ${profile.bloodType}`);
  }

  return parts.length ? `[Контекст пациента: ${parts.join('. ')}]\n\n` : '';
}

function generateMockAiResponse(
  userMessage: string,
  score: { totalScore: number; cardiovascularScore?: number | null; sleepScore?: number | null; mentalScore?: number | null; digestiveScore?: number | null; musculoskeletalScore?: number | null } | null,
  profile: { bloodType?: string | null; heightCm?: number | null; weightKg?: string | null } | null,
): string {
  const lower = userMessage.toLowerCase();
  const ctx = buildHealthContext(score, profile);

  // Personalise based on weak systems if relevant question
  if (lower.includes('сон') || lower.includes('спать') || lower.includes('усталост')) {
    const extra = score?.sleepScore != null && score.sleepScore < 60
      ? ` По твоему тесту Health Score раздел «Сон» составляет ${score.sleepScore}/100 — есть над чем работать.`
      : '';
    return ctx + `Для улучшения сна рекомендую ложиться в одно и то же время каждый день. Оптимальная продолжительность — 7–9 часов. Избегай экранов за час до сна и создай комфортную температуру в спальне (18–20°C).${extra}`;
  }
  if (lower.includes('питание') || lower.includes('еда') || lower.includes('диет') || lower.includes('калори')) {
    const extra = score?.digestiveScore != null && score.digestiveScore < 60
      ? ` Раздел «ЖКТ и питание» в твоём тесте — ${score.digestiveScore}/100. Обрати особое внимание на рацион.`
      : '';
    return ctx + `Сбалансированное питание — основа здоровья. Метод тарелки: ½ — овощи, ¼ — белок, ¼ — злаки. Пей не менее 2 литров воды в день.${extra}`;
  }
  if (lower.includes('стресс') || lower.includes('тревог') || lower.includes('нервы') || lower.includes('депрессия')) {
    const extra = score?.mentalScore != null && score.mentalScore < 60
      ? ` Раздел «Психо и стресс» в твоём тесте — ${score.mentalScore}/100. Уделяй особое внимание восстановлению.`
      : '';
    return ctx + `Стресс — один из главных факторов риска. Техника дыхания 4-7-8: вдох на 4 счёта, задержка на 7, выдох на 8 — повтори 3 раза. Медитация 10 минут в день снижает кортизол на 15–20%.${extra}`;
  }
  if (lower.includes('давление') || lower.includes('пульс') || lower.includes('сердц')) {
    const extra = score?.cardiovascularScore != null && score.cardiovascularScore < 60
      ? ` Раздел «Сердце и сосуды» в твоём тесте — ${score.cardiovascularScore}/100. Рекомендую обратить особое внимание на кардиоздоровье.`
      : '';
    return ctx + `Нормальное давление — до 120/80 мм рт. ст., пульс в покое — 60–100 уд/мин. Для улучшения сердечно-сосудистого здоровья рекомендую 150 минут умеренной активности в неделю.${extra}`;
  }
  if (lower.includes('вес') || lower.includes('похудеть') || lower.includes('спорт') || lower.includes('тренировка')) {
    return ctx + 'Здоровое снижение веса — 0.5–1 кг в неделю. Ключевые факторы: умеренный дефицит калорий (200–300 ккал), белок 1.6–2 г/кг, силовые тренировки 2–3 раза в неделю.';
  }
  if (lower.includes('витамин') || lower.includes('добавк') || lower.includes('бад')) {
    return ctx + 'При сбалансированном питании большинству людей не нужны добавки. Исключение — витамин D (особенно в зимний период), омега-3, B12 (для вегетарианцев). Перед приёмом любых добавок рекомендую сдать анализы крови.';
  }
  if (lower.includes('health score') || lower.includes('хелс скор') || lower.includes('результат теста')) {
    if (score) {
      const label = score.totalScore >= 80 ? 'отличный' : score.totalScore >= 65 ? 'хороший' : score.totalScore >= 50 ? 'средний' : 'требующий внимания';
      return `Твой Health Score — ${score.totalScore}/100 (${label}). ${buildHealthContext(score, profile)}Чтобы улучшить показатели, начни со слабых систем. Задай конкретный вопрос, и я дам персональные рекомендации.`;
    }
    return 'Чтобы узнать свой Health Score, перейди в раздел «Тест» и пройди тест по 5 системам. Это займёт около 7 минут.';
  }

  const scoreHint = score
    ? ` Кстати, твой Health Score сейчас ${score.totalScore}/100.`
    : '';
  return ctx + `Спасибо за вопрос! Расскажи подробнее о своём состоянии — это поможет дать более точный ответ.${scoreHint} Мои рекомендации носят информационный характер и не заменяют консультацию врача.`;
}

function getQuickReplies(userMessage: string): string[] {
  const lower = userMessage.toLowerCase();
  if (lower.includes('сон')) return ['Как улучшить качество сна?', 'Нормы сна по возрасту', 'Снотворное — вредно?'];
  if (lower.includes('питание') || lower.includes('еда')) return ['Какой завтрак лучший?', 'Можно ли есть после 18?', 'Как считать калории?'];
  if (lower.includes('стресс')) return ['Техники релаксации', 'Медитация для начинающих', 'Когда идти к психологу?'];
  return ['Расскажи подробнее', 'Какие анализы сдать?', 'Когда обратиться к врачу?'];
}
