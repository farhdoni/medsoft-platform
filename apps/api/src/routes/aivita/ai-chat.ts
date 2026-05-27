import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { aiChatMessages, platformSettings } from '@medsoft/db';
import { eq, desc, and, gte, count } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aiChatRouter = new Hono();

aiChatRouter.use('*', requireAivitaAuth);

// ─── GET /ai-chat/daily-usage ────────────────────────────────────────────────

aiChatRouter.get('/daily-usage', async (c) => {
  const userId = c.get('aivitaUserId');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [usedResult, settingResult] = await Promise.all([
    db.select({ cnt: count() })
      .from(aiChatMessages)
      .where(and(
        eq(aiChatMessages.userId, userId),
        eq(aiChatMessages.role, 'user'),
        gte(aiChatMessages.createdAt, startOfDay),
      )),
    db.select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, 'ai_daily_limit_per_user'))
      .limit(1),
  ]);

  const used  = Number(usedResult[0]?.cnt ?? 0);
  const limit = parseInt(settingResult[0]?.value ?? '50', 10) || 50;

  return c.json({ used, limit, allowed: used < limit });
});

// ─── GET /ai-chat/history ─────────────────────────────────────────────────────

aiChatRouter.get('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  const limitParam = c.req.query('limit');
  const limit = Math.min(parseInt(limitParam ?? '50', 10) || 50, 200);

  const rows = await db.select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, userId))
    .orderBy(desc(aiChatMessages.seq))
    .limit(limit);

  // Return in chronological order (oldest first)
  return c.json({ data: rows.reverse() });
});

// ─── POST /ai-chat/message ────────────────────────────────────────────────────

const saveSchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().min(1).max(20000),
  })).min(1).max(20),
});

aiChatRouter.post(
  '/message',
  zValidator('json', saveSchema),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { messages } = c.req.valid('json');

    await db.insert(aiChatMessages).values(
      messages.map((m) => ({
        userId,
        role:    m.role,
        content: m.content,
      }))
    );

    return c.json({ data: { saved: messages.length } }, 201);
  }
);

// ─── DELETE /ai-chat/history ──────────────────────────────────────────────────

aiChatRouter.delete('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.delete(aiChatMessages).where(eq(aiChatMessages.userId, userId));
  return c.json({ data: { cleared: true } });
});
