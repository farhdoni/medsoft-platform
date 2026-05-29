import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { moodLogs, mentalActivities, mentalTherapistMessages } from '@medsoft/db';
import { eq, and, gte, desc, avg, count } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const mentalHealthRouter = new Hono();

mentalHealthRouter.use('*', requireAivitaAuth);

// ─── POST /mental/mood ────────────────────────────────────────────────────────

mentalHealthRouter.post(
  '/mood',
  zValidator('json', z.object({
    mood:    z.number().int().min(1).max(5),
    factors: z.array(z.string()).optional().default([]),
    note:    z.string().max(500).optional(),
    date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { mood, factors, note, date } = c.req.valid('json');
    const today = date ?? new Date().toISOString().split('T')[0];

    const [entry] = await db.insert(moodLogs).values({
      userId, mood, factors, note, date: today,
    }).returning();

    return c.json({ data: entry }, 201);
  }
);

// ─── GET /mental/mood ─────────────────────────────────────────────────────────

mentalHealthRouter.get('/mood', async (c) => {
  const userId = c.get('aivitaUserId');
  const period = c.req.query('period') ?? '30d';
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const rows = await db.select()
    .from(moodLogs)
    .where(and(eq(moodLogs.userId, userId), gte(moodLogs.date, from)))
    .orderBy(desc(moodLogs.createdAt))
    .limit(100);

  return c.json({ data: rows });
});

// ─── GET /mental/mood/stats ───────────────────────────────────────────────────

mentalHealthRouter.get('/mood/stats', async (c) => {
  const userId = c.get('aivitaUserId');
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [stats] = await db.select({
    avg: avg(moodLogs.mood),
    cnt: count(),
  })
    .from(moodLogs)
    .where(and(eq(moodLogs.userId, userId), gte(moodLogs.date, from)));

  const recent = await db.select({ mood: moodLogs.mood, date: moodLogs.date })
    .from(moodLogs)
    .where(eq(moodLogs.userId, userId))
    .orderBy(desc(moodLogs.createdAt))
    .limit(7);

  const trend = recent.length >= 2
    ? (Number(recent[0].mood) > Number(recent[recent.length - 1].mood) ? 'up' : 'down')
    : 'stable';

  return c.json({
    data: {
      avg:   stats?.avg ? Math.round(Number(stats.avg) * 10) / 10 : null,
      count: Number(stats?.cnt ?? 0),
      trend,
      recent: recent.reverse(),
    },
  });
});

// ─── POST /mental/breathing/log ───────────────────────────────────────────────

mentalHealthRouter.post(
  '/breathing/log',
  zValidator('json', z.object({
    exercise:         z.string().min(1),
    duration_seconds: z.number().int().positive(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { exercise, duration_seconds } = c.req.valid('json');

    const [entry] = await db.insert(mentalActivities).values({
      userId, type: 'breathing', exerciseId: exercise, durationSeconds: duration_seconds,
    }).returning();

    return c.json({ data: entry }, 201);
  }
);

// ─── POST /mental/meditation/log ──────────────────────────────────────────────

mentalHealthRouter.post(
  '/meditation/log',
  zValidator('json', z.object({
    meditation_id:    z.string().min(1),
    duration_seconds: z.number().int().positive(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { meditation_id, duration_seconds } = c.req.valid('json');

    const [entry] = await db.insert(mentalActivities).values({
      userId, type: 'meditation', exerciseId: meditation_id, durationSeconds: duration_seconds,
    }).returning();

    return c.json({ data: entry }, 201);
  }
);

// ─── POST /mental/therapist/message ──────────────────────────────────────────

const CBT_SYSTEM = `Ты CBT-терапевт AI-платформы AIVITA. Помогаешь пользователям разобраться в эмоциях и мыслях, находить когнитивные искажения и применять техники КПТ.
Будь эмпатичным, тёплым и профессиональным. Задавай уточняющие вопросы. Предлагай конкретные техники.
При упоминании серьёзных проблем (суицид, насилие, острый кризис) — рекомендуй обратиться к специалисту или на горячую линию.
Никогда не ставь диагнозов. Веди разговор по-русски. Ответы краткие — 2-4 абзаца максимум.`;

mentalHealthRouter.post(
  '/therapist/message',
  zValidator('json', z.object({
    message: z.string().min(1).max(2000),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { message } = c.req.valid('json');

    // Save user message
    await db.insert(mentalTherapistMessages).values({ userId, role: 'user', content: message });

    // Get last 6 messages for context
    const history = await db.select()
      .from(mentalTherapistMessages)
      .where(eq(mentalTherapistMessages.userId, userId))
      .orderBy(desc(mentalTherapistMessages.createdAt))
      .limit(6);

    const key = process.env.ANTHROPIC_API_KEY;
    let reply = 'Я слышу вас. Расскажите подробнее — что именно происходит?';

    if (key) {
      try {
        const messages = history.reverse().map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 512,
            system: CBT_SYSTEM,
            messages,
          }),
        });

        if (resp.ok) {
          const data = await resp.json() as { content: Array<{ type: string; text: string }> };
          reply = data.content?.[0]?.text ?? reply;
        }
      } catch { /* use default reply */ }
    }

    // Save assistant response
    const [saved] = await db.insert(mentalTherapistMessages).values({ userId, role: 'assistant', content: reply }).returning();

    return c.json({ data: { message: saved } });
  }
);

// ─── GET /mental/therapist/history ───────────────────────────────────────────

mentalHealthRouter.get('/therapist/history', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select()
    .from(mentalTherapistMessages)
    .where(eq(mentalTherapistMessages.userId, userId))
    .orderBy(desc(mentalTherapistMessages.createdAt))
    .limit(50);
  return c.json({ data: rows.reverse() });
});
