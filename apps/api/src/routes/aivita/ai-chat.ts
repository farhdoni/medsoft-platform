import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { aiChatMessages, aiChatArchives, platformSettings, aiUsageLogs } from '@medsoft/db';
import { eq, desc, asc, and, gte, count } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { computeCostUsd } from '../../lib/ai-pricing.js';
import { logger } from '../../lib/logger.js';

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

// ─── POST /ai-chat/usage-log ──────────────────────────────────────────────────
// Internal: apps/aivita has no direct DB access (patientContext.ts's own
// docstring), so it forwards its own session cookie here the same way it
// already does for buildPatientContext/checkDailyLimit — no separate
// service secret, requireAivitaAuth above already scopes this to the
// caller's own userId. Called fire-and-forget after the chat stream ends;
// a failure here must never surface to the chat response, so every error
// path below returns 200 with an error flag instead of a non-2xx status.

const usageLogSchema = z.object({
  model: z.string().min(1).max(50),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheCreationInputTokens: z.number().int().min(0).default(0),
  cacheReadInputTokens: z.number().int().min(0).default(0),
  responseTimeMs: z.number().int().min(0).optional(),
});

aiChatRouter.post(
  '/usage-log',
  rateLimit('ai-chat-usage-log', 60, 300),
  zValidator('json', usageLogSchema),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    try {
      const costUsd = computeCostUsd(
        body.model,
        body.inputTokens,
        body.outputTokens,
        body.cacheCreationInputTokens,
        body.cacheReadInputTokens,
      );

      await db.insert(aiUsageLogs).values({
        aivitaUserId: userId,
        module: 'chat',
        model: body.model,
        inputTokens: body.inputTokens,
        outputTokens: body.outputTokens,
        cacheCreationInputTokens: body.cacheCreationInputTokens,
        cacheReadInputTokens: body.cacheReadInputTokens,
        costUsd: costUsd === null ? null : costUsd.toString(),
        responseTimeMs: body.responseTimeMs,
      });

      return c.json({ data: { logged: true } });
    } catch (err) {
      logger.error({ err, userId }, '[ai-chat/usage-log] insert failed');
      return c.json({ data: { logged: false } });
    }
  }
);

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

// ─── DELETE /ai-chat/message/:id — удалить одно сообщение ────────────────────

aiChatRouter.delete('/message/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id = c.req.param('id');

  const [existing] = await db.select({ id: aiChatMessages.id })
    .from(aiChatMessages)
    .where(and(eq(aiChatMessages.id, id), eq(aiChatMessages.userId, userId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(aiChatMessages).where(eq(aiChatMessages.id, id));
  return c.json({ data: { deleted: true } });
});

// ─── DELETE /ai-chat/history — очистить всю историю ──────────────────────────

aiChatRouter.delete('/history', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.delete(aiChatMessages).where(eq(aiChatMessages.userId, userId));
  return c.json({ data: { cleared: true } });
});

// ─── POST /ai-chat/archive — архивировать текущий чат ────────────────────────

aiChatRouter.post('/archive', async (c) => {
  const userId = c.get('aivitaUserId');

  const rows = await db.select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, userId))
    .orderBy(asc(aiChatMessages.seq));

  if (rows.length === 0) return c.json({ error: 'No messages to archive' }, 400);

  // Generate title from first user message (truncated)
  const firstUser = rows.find(r => r.role === 'user');
  const rawTitle  = firstUser?.content ?? 'Архив чата';
  const title     = rawTitle.length > 80 ? rawTitle.slice(0, 80) + '…' : rawTitle;

  const [archive] = await db.insert(aiChatArchives).values({
    userId,
    title,
    messages:     rows.map(r => ({ role: r.role, content: r.content })),
    messageCount: rows.length,
  }).returning();

  // Clear current chat
  await db.delete(aiChatMessages).where(eq(aiChatMessages.userId, userId));

  return c.json({ data: archive }, 201);
});

// ─── GET /ai-chat/archives — список архивов ──────────────────────────────────

aiChatRouter.get('/archives', async (c) => {
  const userId = c.get('aivitaUserId');

  const rows = await db.select({
    id:           aiChatArchives.id,
    title:        aiChatArchives.title,
    messageCount: aiChatArchives.messageCount,
    createdAt:    aiChatArchives.createdAt,
  })
    .from(aiChatArchives)
    .where(eq(aiChatArchives.userId, userId))
    .orderBy(desc(aiChatArchives.createdAt))
    .limit(50);

  return c.json({ data: rows });
});

// ─── GET /ai-chat/archives/:id — конкретный архив ────────────────────────────

aiChatRouter.get('/archives/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id     = parseInt(c.req.param('id'), 10);

  const [row] = await db.select()
    .from(aiChatArchives)
    .where(and(eq(aiChatArchives.id, id), eq(aiChatArchives.userId, userId)))
    .limit(1);

  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

// ─── DELETE /ai-chat/archives/:id — удалить архив ────────────────────────────

aiChatRouter.delete('/archives/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id     = parseInt(c.req.param('id'), 10);

  const [existing] = await db.select({ id: aiChatArchives.id })
    .from(aiChatArchives)
    .where(and(eq(aiChatArchives.id, id), eq(aiChatArchives.userId, userId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(aiChatArchives).where(eq(aiChatArchives.id, id));
  return c.json({ data: { deleted: true } });
});
