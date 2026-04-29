import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { chatSessions, chatMessages } from '@medsoft/db';
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
      const aiContent = generateMockAiResponse(body.content);
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

function generateMockAiResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes('сон') || lower.includes('спать') || lower.includes('усталост')) {
    return 'Для улучшения сна рекомендую ложиться в одно и то же время каждый день. Оптимальная продолжительность — 7–9 часов. Избегай экранов за час до сна и постарайся создать комфортную температуру в спальне (18–20°C).';
  }
  if (lower.includes('питание') || lower.includes('еда') || lower.includes('диет') || lower.includes('калори')) {
    return 'Сбалансированное питание — основа здоровья. Старайся включать белки (мясо, рыба, бобовые), сложные углеводы и больше овощей. Рекомендую метод тарелки: ½ — овощи, ¼ — белок, ¼ — злаки. Пей не менее 2 литров воды в день.';
  }
  if (lower.includes('стресс') || lower.includes('тревог') || lower.includes('нервы') || lower.includes('депрессия')) {
    return 'Стресс — один из главных факторов риска. Попробуй технику дыхания 4-7-8: вдох на 4 счёта, задержка на 7, выдох на 8 — повтори 3 раза. Регулярные прогулки и медитация по 10 минут в день снижают уровень кортизола на 15–20%.';
  }
  if (lower.includes('давление') || lower.includes('пульс') || lower.includes('сердц')) {
    return 'Нормальное давление — до 120/80 мм рт. ст., пульс в покое — 60–100 уд/мин. Для улучшения сердечно-сосудистого здоровья рекомендую 150 минут умеренной активности в неделю. Если показатели стабильно отличаются — обратись к кардиологу.';
  }
  if (lower.includes('вес') || lower.includes('похудеть') || lower.includes('спорт') || lower.includes('тренировка')) {
    return 'Здоровое снижение веса — 0.5–1 кг в неделю. Ключевые факторы: умеренный дефицит калорий (200–300 ккал), белок 1.6–2 г/кг, силовые тренировки 2–3 раза в неделю. Жёсткие диеты дают краткосрочный результат и вредны для метаболизма.';
  }
  if (lower.includes('витамин') || lower.includes('добавк') || lower.includes('бад')) {
    return 'При сбалансированном питании большинству людей не нужны добавки. Исключение — витамин D (особенно в зимний период), омега-3, B12 (для вегетарианцев). Перед приёмом любых добавок рекомендую сдать анализы крови.';
  }
  return 'Спасибо за вопрос! Расскажи подробнее о своём состоянии и симптомах — это поможет дать более точный ответ. Помни, что мои рекомендации носят информационный характер и не заменяют консультацию врача.';
}

function getQuickReplies(userMessage: string): string[] {
  const lower = userMessage.toLowerCase();
  if (lower.includes('сон')) return ['Как улучшить качество сна?', 'Нормы сна по возрасту', 'Снотворное — вредно?'];
  if (lower.includes('питание') || lower.includes('еда')) return ['Какой завтрак лучший?', 'Можно ли есть после 18?', 'Как считать калории?'];
  if (lower.includes('стресс')) return ['Техники релаксации', 'Медитация для начинающих', 'Когда идти к психологу?'];
  return ['Расскажи подробнее', 'Какие анализы сдать?', 'Когда обратиться к врачу?'];
}
