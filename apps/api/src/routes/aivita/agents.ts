import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { agentAlerts, agentSettings } from '@medsoft/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const agentsRouter = new Hono();
agentsRouter.use('*', requireAivitaAuth);

// ─── GET /agents/alerts ────────────────────────────────────────────────────────
// Returns last 50 non-dismissed alerts for the current user
agentsRouter.get('/alerts', async (c) => {
  const userId = c.get('aivitaUserId');
  const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);
  const onlyUnread = c.req.query('unread') === 'true';

  const rows = await db.select()
    .from(agentAlerts)
    .where(
      and(
        eq(agentAlerts.userId, userId),
        eq(agentAlerts.isDismissed, false),
        ...(onlyUnread ? [eq(agentAlerts.isRead, false)] : []),
      )
    )
    .orderBy(desc(agentAlerts.createdAt))
    .limit(limit);

  const unreadCount = rows.filter((r) => !r.isRead).length;
  return c.json({ data: rows, unreadCount });
});

// ─── PUT /agents/alerts/read ───────────────────────────────────────────────────
agentsRouter.put(
  '/alerts/read',
  zValidator('json', z.object({ ids: z.array(z.string().uuid()).min(1).max(100) })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { ids } = c.req.valid('json');
    await db.update(agentAlerts)
      .set({ isRead: true })
      .where(and(eq(agentAlerts.userId, userId), inArray(agentAlerts.id, ids)));
    return c.json({ ok: true });
  }
);

// ─── PUT /agents/alerts/read-all ──────────────────────────────────────────────
agentsRouter.put('/alerts/read-all', async (c) => {
  const userId = c.get('aivitaUserId');
  await db.update(agentAlerts)
    .set({ isRead: true })
    .where(eq(agentAlerts.userId, userId));
  return c.json({ ok: true });
});

// ─── PUT /agents/alerts/:id/dismiss ───────────────────────────────────────────
agentsRouter.put('/alerts/:id/dismiss', async (c) => {
  const userId = c.get('aivitaUserId');
  const id = c.req.param('id');
  await db.update(agentAlerts)
    .set({ isDismissed: true, isRead: true })
    .where(and(eq(agentAlerts.userId, userId), eq(agentAlerts.id, id)));
  return c.json({ ok: true });
});

// ─── GET /agents/settings ─────────────────────────────────────────────────────
agentsRouter.get('/settings', async (c) => {
  const userId = c.get('aivitaUserId');
  const [row] = await db.select().from(agentSettings).where(eq(agentSettings.userId, userId)).limit(1);
  if (!row) {
    // Return defaults without creating a row
    return c.json({
      data: {
        vitalsMonitorEnabled: true,
        documentParserEnabled: true,
        medicationTrackerEnabled: true,
        weeklyCheckupEnabled: true,
        alertThresholds: {},
      },
    });
  }
  return c.json({ data: row });
});

// ─── PUT /agents/settings ─────────────────────────────────────────────────────
const thresholdsSchema = z.object({
  pulse_high: z.number().optional(),
  pulse_low: z.number().optional(),
  systolic_high: z.number().optional(),
  systolic_low: z.number().optional(),
  diastolic_high: z.number().optional(),
  diastolic_low: z.number().optional(),
  spo2_low: z.number().optional(),
  sugar_high: z.number().optional(),
  sugar_low: z.number().optional(),
  temp_high: z.number().optional(),
  temp_low: z.number().optional(),
}).optional();

agentsRouter.put(
  '/settings',
  zValidator('json', z.object({
    vitalsMonitorEnabled: z.boolean().optional(),
    documentParserEnabled: z.boolean().optional(),
    medicationTrackerEnabled: z.boolean().optional(),
    weeklyCheckupEnabled: z.boolean().optional(),
    alertThresholds: thresholdsSchema,
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [existing] = await db.select({ id: agentSettings.id })
      .from(agentSettings)
      .where(eq(agentSettings.userId, userId))
      .limit(1);

    if (existing) {
      await db.update(agentSettings)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(agentSettings.userId, userId));
    } else {
      await db.insert(agentSettings).values({ userId, ...body, updatedAt: new Date() });
    }

    const [updated] = await db.select().from(agentSettings).where(eq(agentSettings.userId, userId)).limit(1);
    return c.json({ data: updated });
  }
);
