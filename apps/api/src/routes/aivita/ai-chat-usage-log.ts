import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, aiUsageLogs } from '@medsoft/db';
import { rateLimit } from '../../middleware/rate-limit.js';
import { checkInternalServiceToken } from '../../lib/internal-auth.js';
import { computeCostUsd } from '../../lib/ai-pricing.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../env.js';

// Deliberately mounted at its OWN path (/v1/aivita/ai-chat-usage-log, see
// index.ts), NOT nested under /v1/aivita/ai-chat like aiChatRouter — a
// shared-prefix mount was tried first and silently broke this endpoint:
// Hono matches aiChatRouter's `use('*', requireAivitaAuth)` for ANY path
// under that prefix regardless of which sub-router "owns" the exact route
// (confirmed live — every request here came back 401 from requireAivitaAuth
// itself, service token never even checked, since that middleware returns
// a Response directly on a missing cookie and short-circuits before this
// router's own handler runs). A distinct path sidesteps the collision
// entirely instead of depending on registration order, which is a subtler
// invariant to keep correct.
//
// This endpoint is called by the aivita SERVICE after a chat response has
// already gone out, not by an end user's browser, so it must not accept
// (or need) a user session at all. Trust comes entirely from
// X-Internal-Service-Token; aivitaUserId is whatever apps/aivita already
// resolved from ITS OWN verified session before calling here (see
// chat/route.ts's logChatUsage) — this endpoint has no way to double-check
// that claim itself, which is why it must never be reachable by anything
// that isn't the aivita service (mirrors how verifyTelegramWebhookSecret in
// lib/telegram.ts gates a public webhook with no other auth at all).
export const aiChatUsageLogRouter = new Hono();

const usageLogSchema = z.object({
  aivitaUserId: z.string().uuid(),
  model: z.string().min(1).max(50),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheCreationInputTokens: z.number().int().min(0).default(0),
  cacheReadInputTokens: z.number().int().min(0).default(0),
  responseTimeMs: z.number().int().min(0).optional(),
});

aiChatUsageLogRouter.post(
  '/',
  rateLimit('ai-chat-usage-log', 60, 300),
  async (c, next) => {
    const authResult = checkInternalServiceToken(c.req.header('X-Internal-Service-Token'), env.INTERNAL_SERVICE_TOKEN);
    if (authResult === 'missing_config') return c.json({ error: 'usage_logging_disabled' }, 503);
    if (authResult === 'invalid') return c.json({ error: 'Unauthorized' }, 401);
    await next();
  },
  zValidator('json', usageLogSchema),
  async (c) => {
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
        aivitaUserId: body.aivitaUserId,
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
      logger.error({ err, aivitaUserId: body.aivitaUserId }, '[ai-chat/usage-log] insert failed');
      return c.json({ data: { logged: false } });
    }
  }
);
