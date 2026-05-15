import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  payments, subscriptions, subscriptionPlans, aivitaUsers, promoCodes,
} from '@medsoft/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export const adminFinanceRouter = new Hono();

function dateRangeFilter(period: string) {
  const now = new Date();
  switch (period) {
    case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year': return new Date(now.getFullYear(), 0, 1);
    default: return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

// ─── GET /v1/admin/finance/dashboard ─────────────────────────────────────────

adminFinanceRouter.get('/dashboard', async (c) => {
  const period = c.req.query('period') ?? 'month';
  const since = dateRangeFilter(period);

  const [totalRevenue, subscriptionRevenue, activeSubscriptions, totalPayments] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, since))),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), eq(payments.type, 'subscription'), gte(payments.createdAt, since))),
    db.select({ cnt: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active')),
    db.select({ cnt: sql<number>`count(*)` })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, since))),
  ]);

  // Daily revenue chart (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyRevenue = await db.select({
    date: sql<string>`date_trunc('day', created_at)::date`,
    total: sql<number>`coalesce(sum(amount), 0)`,
  })
    .from(payments)
    .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, thirtyDaysAgo)))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  // Revenue by type
  const byType = await db.select({
    type: payments.type,
    total: sql<number>`coalesce(sum(amount), 0)`,
    cnt: sql<number>`count(*)`,
  })
    .from(payments)
    .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, since)))
    .groupBy(payments.type);

  // Revenue by provider
  const byProvider = await db.select({
    provider: payments.provider,
    total: sql<number>`coalesce(sum(amount), 0)`,
    cnt: sql<number>`count(*)`,
  })
    .from(payments)
    .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, since)))
    .groupBy(payments.provider);

  // Active subscriptions by plan
  const byPlan = await db.select({
    planName: subscriptionPlans.name,
    planSlug: subscriptionPlans.slug,
    cnt: sql<number>`count(*)`,
  })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.status, 'active'))
    .groupBy(subscriptionPlans.name, subscriptionPlans.slug);

  // Average check
  const totalRev = Number(totalRevenue[0]?.total ?? 0);
  const totalCnt = Number(totalPayments[0]?.cnt ?? 0);
  const avgCheck = totalCnt > 0 ? Math.round(totalRev / totalCnt) : 0;

  return c.json({
    revenue: {
      total: totalRev,
      subscription: Number(subscriptionRevenue[0]?.total ?? 0),
      avgCheck,
    },
    activeSubscriptions: Number(activeSubscriptions[0]?.cnt ?? 0),
    totalPayments: totalCnt,
    dailyRevenue,
    byType,
    byProvider,
    byPlan,
  });
});

// ─── GET /v1/admin/finance/payments ──────────────────────────────────────────

adminFinanceRouter.get('/payments', async (c) => {
  const { status, provider, type, from, to, page = '1', limit = '50' } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (status) conditions.push(eq(payments.status, status));
  if (provider) conditions.push(eq(payments.provider, provider));
  if (type) conditions.push(eq(payments.type, type));
  if (from) conditions.push(gte(payments.createdAt, new Date(from)));
  if (to) conditions.push(lte(payments.createdAt, new Date(to)));

  const [rows, total] = await Promise.all([
    db.select({
      payment: payments,
      userName: aivitaUsers.name,
      userEmail: aivitaUsers.email,
    })
      .from(payments)
      .leftJoin(aivitaUsers, eq(payments.userId, aivitaUsers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(parseInt(limit))
      .offset(offset),
    db.select({ cnt: sql<number>`count(*)` })
      .from(payments)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  return c.json({ data: rows, total: Number(total[0]?.cnt ?? 0) });
});

// ─── POST /v1/admin/finance/payments/:id/refund ───────────────────────────────

adminFinanceRouter.post('/payments/:id/refund', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.update(payments)
    .set({ status: 'refunded' })
    .where(eq(payments.id, id));
  return c.json({ success: true });
});

// ─── GET /v1/admin/finance/subscriptions ─────────────────────────────────────

adminFinanceRouter.get('/subscriptions', async (c) => {
  const { status, page = '1', limit = '50' } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = status ? [eq(subscriptions.status, status)] : [];

  const [rows, total] = await Promise.all([
    db.select({
      subscription: subscriptions,
      plan: subscriptionPlans,
      userName: aivitaUsers.name,
      userEmail: aivitaUsers.email,
    })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .leftJoin(aivitaUsers, eq(subscriptions.userId, aivitaUsers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(subscriptions.createdAt))
      .limit(parseInt(limit))
      .offset(offset),
    db.select({ cnt: sql<number>`count(*)` })
      .from(subscriptions)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  // MRR calculation
  const mrrResult = await db.select({
    total: sql<number>`coalesce(sum(sp.price), 0)`,
  })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.status, 'active'));

  return c.json({
    data: rows,
    total: Number(total[0]?.cnt ?? 0),
    mrr: Number(mrrResult[0]?.total ?? 0),
  });
});

// ─── GET /v1/admin/finance/promo-codes ────────────────────────────────────────

adminFinanceRouter.get('/promo-codes', async (c) => {
  const rows = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  return c.json({ data: rows });
});

adminFinanceRouter.post('/promo-codes', async (c) => {
  const body = await c.req.json() as {
    code: string; discountType: string; discountValue: number;
    maxUses?: number; validUntil?: string; planSlugs?: string[];
  };
  const [promo] = await db.insert(promoCodes).values({
    code: body.code.toUpperCase(),
    discountType: body.discountType,
    discountValue: body.discountValue,
    maxUses: body.maxUses ?? null,
    validUntil: body.validUntil ? new Date(body.validUntil) : null,
    planSlugs: body.planSlugs ?? [],
    isActive: true,
  }).returning();
  return c.json({ data: promo });
});

adminFinanceRouter.patch('/promo-codes/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as Partial<{ isActive: boolean; maxUses: number; validUntil: string }>;
  await db.update(promoCodes).set({
    ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    ...(body.maxUses !== undefined ? { maxUses: body.maxUses } : {}),
    ...(body.validUntil ? { validUntil: new Date(body.validUntil) } : {}),
  }).where(eq(promoCodes.id, id));
  return c.json({ success: true });
});

adminFinanceRouter.delete('/promo-codes/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.update(promoCodes).set({ isActive: false }).where(eq(promoCodes.id, id));
  return c.json({ success: true });
});

// ─── GET/PATCH /v1/admin/finance/plans ───────────────────────────────────────

adminFinanceRouter.get('/plans', async (c) => {
  const rows = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.id);
  return c.json({ data: rows });
});

adminFinanceRouter.patch('/plans/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as Partial<{ price: number; isActive: boolean; name: string }>;
  await db.update(subscriptionPlans).set({
    ...(body.price !== undefined ? { price: body.price } : {}),
    ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    ...(body.name ? { name: body.name } : {}),
  }).where(eq(subscriptionPlans.id, id));
  return c.json({ success: true });
});
