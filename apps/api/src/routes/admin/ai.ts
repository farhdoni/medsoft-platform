import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import { platformSettings, aiUsageLogs } from '@medsoft/db';
import { eq, desc, gte, lte, and, sql, count, sum, inArray } from 'drizzle-orm';

// ─── /v1/admin/settings/ai ───────────────────────────────────────────────────

export const aiSettingsRouter = new Hono();
aiSettingsRouter.use('*', requireAuth);

const AI_KEYS = [
  'ai_provider',
  'ai_model',
  'ai_system_prompt_chat',
  'ai_system_prompt_checkup',
  'ai_system_prompt_scribe',
  'ai_max_tokens',
  'ai_temperature',
  'ai_daily_limit_per_user',
  'ai_monthly_limit_per_user',
];

aiSettingsRouter.get('/', async (c) => {
  const rows = await db.select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, AI_KEYS));
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value ?? '';
  return c.json({ settings });
});

aiSettingsRouter.put('/', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    if (!AI_KEYS.includes(key)) continue;
    await db.insert(platformSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
  return c.json({ ok: true });
});

// ─── /v1/admin/ai ─────────────────────────────────────────────────────────────

export const aiUsageRouter = new Hono();
aiUsageRouter.use('*', requireAuth);

aiUsageRouter.get('/logs', async (c) => {
  const { module, model, page = '1', limit = '50', dateFrom, dateTo } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (module) conditions.push(eq(aiUsageLogs.module, module));
  if (model) conditions.push(eq(aiUsageLogs.model, model));
  if (dateFrom) conditions.push(gte(aiUsageLogs.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(aiUsageLogs.createdAt, new Date(dateTo)));

  const [rows, totalResult] = await Promise.all([
    db.select()
      .from(aiUsageLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(aiUsageLogs.createdAt))
      .limit(parseInt(limit))
      .offset(offset),
    db.select({ cnt: count() })
      .from(aiUsageLogs)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  return c.json({
    data: rows,
    total: Number(totalResult[0]?.cnt ?? 0),
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

aiUsageRouter.get('/usage-summary', async (c) => {
  const { dateFrom, dateTo } = c.req.query();
  const now = new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = dateTo ? new Date(dateTo) : now;

  const [totals, byModule, byModel] = await Promise.all([
    db.select({
      totalRequests: count(),
      totalInputTokens: sum(aiUsageLogs.inputTokens),
      totalOutputTokens: sum(aiUsageLogs.outputTokens),
      totalCostUsd: sql<string>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
      avgResponseMs: sql<number>`coalesce(avg(${aiUsageLogs.responseTimeMs}), 0)`,
    })
      .from(aiUsageLogs)
      .where(and(gte(aiUsageLogs.createdAt, from), lte(aiUsageLogs.createdAt, to))),
    db.select({
      module: aiUsageLogs.module,
      requests: count(),
      inputTokens: sum(aiUsageLogs.inputTokens),
      outputTokens: sum(aiUsageLogs.outputTokens),
    })
      .from(aiUsageLogs)
      .where(and(gte(aiUsageLogs.createdAt, from), lte(aiUsageLogs.createdAt, to)))
      .groupBy(aiUsageLogs.module)
      .orderBy(desc(count())),
    db.select({
      model: aiUsageLogs.model,
      requests: count(),
      inputTokens: sum(aiUsageLogs.inputTokens),
      outputTokens: sum(aiUsageLogs.outputTokens),
    })
      .from(aiUsageLogs)
      .where(and(gte(aiUsageLogs.createdAt, from), lte(aiUsageLogs.createdAt, to)))
      .groupBy(aiUsageLogs.model)
      .orderBy(desc(count())),
  ]);

  return c.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      requests: Number(totals[0]?.totalRequests ?? 0),
      inputTokens: Number(totals[0]?.totalInputTokens ?? 0),
      outputTokens: Number(totals[0]?.totalOutputTokens ?? 0),
      costUsd: Number(totals[0]?.totalCostUsd ?? 0),
      avgResponseMs: Math.round(Number(totals[0]?.avgResponseMs ?? 0)),
    },
    byModule: byModule.map(r => ({
      module: r.module,
      requests: Number(r.requests),
      inputTokens: Number(r.inputTokens ?? 0),
      outputTokens: Number(r.outputTokens ?? 0),
    })),
    byModel: byModel.map(r => ({
      model: r.model,
      requests: Number(r.requests),
      inputTokens: Number(r.inputTokens ?? 0),
      outputTokens: Number(r.outputTokens ?? 0),
    })),
  });
});
