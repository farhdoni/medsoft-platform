import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import {
  emailCampaigns, emailTemplates, aivitaUsers, referrals,
} from '@medsoft/db';
import { eq, desc, and, gte, lte, count, sql, isNull } from 'drizzle-orm';
import { createBroadcastNotifications } from '../../lib/notification-service.js';

export const adminMarketingRouter = new Hono();
adminMarketingRouter.use('*', requireAuth);

// ─── Email campaigns ──────────────────────────────────────────────────────────

adminMarketingRouter.get('/email/campaigns', async (c) => {
  const { page = '1', limit = '20' } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [rows, total] = await Promise.all([
    db.select().from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(parseInt(limit))
      .offset(offset),
    db.select({ cnt: count() }).from(emailCampaigns),
  ]);
  return c.json({ data: rows, total: Number(total[0]?.cnt ?? 0) });
});

adminMarketingRouter.post('/email/send', async (c) => {
  const adminId = c.get('adminId');
  const body = await c.req.json() as {
    subject: string;
    bodyHtml: string;
    audience: string;
    scheduledAt?: string;
  };

  // Count recipients
  const audienceMap: Record<string, string | undefined> = {
    patients: 'patient',
    doctors: 'doctor',
    all: undefined,
  };
  const roleFilter = audienceMap[body.audience];
  const recipientQuery = db.select({ cnt: count() }).from(aivitaUsers).where(
    and(
      isNull(aivitaUsers.deletedAt),
      roleFilter ? eq(aivitaUsers.role, roleFilter) : undefined,
      body.audience === 'premium' ? sql`${aivitaUsers.plan} != 'free'` : undefined,
    )
  );
  const [recipientResult] = await recipientQuery;
  const recipientCount = Number(recipientResult?.cnt ?? 0);

  const status = body.scheduledAt ? 'scheduled' : 'sent';
  const sentAt = body.scheduledAt ? null : new Date();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  const [campaign] = await db.insert(emailCampaigns).values({
    subject: body.subject,
    body: body.bodyHtml,
    audience: body.audience,
    recipientCount,
    status,
    sentAt,
    scheduledAt,
    createdById: adminId,
  }).returning();

  return c.json({ campaign }, 201);
});

// ─── Email templates ──────────────────────────────────────────────────────────

adminMarketingRouter.get('/email/templates', async (c) => {
  const rows = await db.select().from(emailTemplates).orderBy(emailTemplates.id);
  return c.json({ data: rows });
});

adminMarketingRouter.post('/email/templates', async (c) => {
  const body = await c.req.json() as { name: string; subject: string; body: string };
  const [row] = await db.insert(emailTemplates).values(body).returning();
  return c.json({ data: row }, 201);
});

adminMarketingRouter.put('/email/templates/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as Partial<{ name: string; subject: string; body: string }>;
  const [row] = await db.update(emailTemplates)
    .set(body)
    .where(eq(emailTemplates.id, id))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

adminMarketingRouter.delete('/email/templates/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  return c.json({ ok: true });
});

// ─── Push notifications ───────────────────────────────────────────────────────

adminMarketingRouter.get('/push/history', async (c) => {
  // Reuse notifications broadcast grouping approach
  const { notifications } = await import('@medsoft/db');
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const rows = await db.select({
    title: notifications.title,
    body: notifications.body,
    link: notifications.link,
    createdAt: sql<string>`min(${notifications.createdAt})`,
    reach: sql<number>`cast(count(*) as int)`,
  })
    .from(notifications)
    .where(eq(notifications.type, 'admin_broadcast'))
    .groupBy(notifications.title, notifications.body, notifications.link)
    .orderBy(desc(sql`min(${notifications.createdAt})`))
    .limit(limit);
  return c.json({ data: rows });
});

adminMarketingRouter.post('/push/send', async (c) => {
  const body = await c.req.json() as {
    title: string;
    body: string;
    link?: string;
    audience: 'all' | 'patients' | 'doctors';
  };

  const whereClause =
    body.audience === 'patients' ? eq(aivitaUsers.role, 'patient') :
    body.audience === 'doctors' ? eq(aivitaUsers.role, 'doctor') :
    undefined;

  const query = db.select({ id: aivitaUsers.id }).from(aivitaUsers);
  const users = whereClause ? await query.where(whereClause) : await query;
  const userIds = users.map(u => u.id);
  await createBroadcastNotifications(userIds, body.title, body.body, { link: body.link });

  return c.json({ sent: userIds.length }, 201);
});

// ─── Referral stats ───────────────────────────────────────────────────────────

adminMarketingRouter.get('/referrals', async (c) => {
  const [totals, topReferrers, dailyChart] = await Promise.all([
    db.select({
      total: count(),
      completed: sql<number>`count(*) filter (where status = 'completed')`,
      rewarded: sql<number>`count(*) filter (where reward_given = true)`,
    }).from(referrals),

    db.select({
      referrerId: referrals.referrerId,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      invited: count(),
      rewarded: sql<number>`count(*) filter (where ${referrals.rewardGiven} = true)`,
    })
      .from(referrals)
      .leftJoin(aivitaUsers, eq(referrals.referrerId, aivitaUsers.id))
      .groupBy(referrals.referrerId, aivitaUsers.name, aivitaUsers.email)
      .orderBy(desc(count()))
      .limit(10),

    db.execute(sql`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS invitations
      FROM referrals
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `),
  ]);

  const total = Number(totals[0]?.total ?? 0);
  const completed = Number(totals[0]?.completed ?? 0);
  const conversionRate = total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0;

  const chart = Array.from(dailyChart).map((r: Record<string, unknown>) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
    invitations: Number(r.invitations ?? 0),
  }));

  return c.json({
    total,
    completed,
    rewarded: Number(totals[0]?.rewarded ?? 0),
    conversionRate,
    topReferrers: topReferrers.map(r => ({
      referrerId: r.referrerId,
      name: r.name,
      email: r.email,
      invited: Number(r.invited),
      rewarded: Number(r.rewarded),
    })),
    dailyChart: chart,
  });
});

// ─── Analytics (funnel + retention) ──────────────────────────────────────────

adminMarketingRouter.get('/analytics', async (c) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    onboardingCompleted,
    activeUsers,
    subscribers,
    retention1d,
    retention7d,
    retention30d,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(aivitaUsers).where(isNull(aivitaUsers.deletedAt)),
    db.select({ cnt: count() }).from(aivitaUsers).where(
      and(isNull(aivitaUsers.deletedAt), eq(aivitaUsers.onboardingCompleted, true))
    ),
    db.select({ cnt: count() }).from(aivitaUsers).where(
      and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.lastLoginAt, thirtyDaysAgo))
    ),
    db.select({ cnt: count() }).from(aivitaUsers).where(
      and(isNull(aivitaUsers.deletedAt), sql`${aivitaUsers.plan} != 'free'`)
    ),
    // Retention: users who logged in within 1 day of registration
    db.select({ cnt: count() }).from(aivitaUsers).where(
      and(
        isNull(aivitaUsers.deletedAt),
        sql`${aivitaUsers.lastLoginAt} IS NOT NULL`,
        sql`EXTRACT(EPOCH FROM (${aivitaUsers.lastLoginAt} - ${aivitaUsers.createdAt}))/86400 >= 1`,
      )
    ),
    // Retention day 7
    db.select({ cnt: count() }).from(aivitaUsers).where(
      and(
        isNull(aivitaUsers.deletedAt),
        sql`${aivitaUsers.lastLoginAt} IS NOT NULL`,
        sql`EXTRACT(EPOCH FROM (${aivitaUsers.lastLoginAt} - ${aivitaUsers.createdAt}))/86400 >= 7`,
      )
    ),
    // Retention day 30
    db.select({ cnt: count() }).from(aivitaUsers).where(
      and(
        isNull(aivitaUsers.deletedAt),
        sql`${aivitaUsers.lastLoginAt} IS NOT NULL`,
        sql`EXTRACT(EPOCH FROM (${aivitaUsers.lastLoginAt} - ${aivitaUsers.createdAt}))/86400 >= 30`,
      )
    ),
  ]);

  const total = Number(totalUsers[0]?.cnt ?? 0);
  const onboarded = Number(onboardingCompleted[0]?.cnt ?? 0);
  const active = Number(activeUsers[0]?.cnt ?? 0);
  const subscribed = Number(subscribers[0]?.cnt ?? 0);

  const funnel = [
    { stage: 'Регистрации', value: total, pct: 100 },
    { stage: 'Онбординг', value: onboarded, pct: total > 0 ? Math.round(onboarded / total * 100) : 0 },
    { stage: 'Активные (30д)', value: active, pct: total > 0 ? Math.round(active / total * 100) : 0 },
    { stage: 'Подписчики', value: subscribed, pct: total > 0 ? Math.round(subscribed / total * 100) : 0 },
  ];

  const retention1 = Number(retention1d[0]?.cnt ?? 0);
  const retention7 = Number(retention7d[0]?.cnt ?? 0);
  const retention30 = Number(retention30d[0]?.cnt ?? 0);

  return c.json({
    funnel,
    retention: {
      day1: total > 0 ? Math.round(retention1 / total * 100) : 0,
      day7: total > 0 ? Math.round(retention7 / total * 100) : 0,
      day30: total > 0 ? Math.round(retention30 / total * 100) : 0,
    },
  });
});
