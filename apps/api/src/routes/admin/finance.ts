import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import {
  payments, subscriptions, subscriptionPlans, aivitaUsers, promoCodes,
} from '@medsoft/db';
import { eq, and, gte, lte, desc, sql, count, lt } from 'drizzle-orm';

export const adminFinanceRouter = new Hono();

adminFinanceRouter.use('*', requireAuth);

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

// ─── GET /v1/admin/finance/overview ──────────────────────────────────────────

adminFinanceRouter.get('/overview', async (c) => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const endOfLastMonth = new Date(startOfMonth.getTime() - 1);

  const [
    revThisMonth,
    revLastMonth,
    mrrResult,
    avgCheckResult,
    totalPaymentsMonth,
    cancelledThisMonth,
    activeSubsStart,
    byProvider,
  ] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, startOfMonth))),
    db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(
        eq(payments.status, 'completed'),
        gte(payments.createdAt, startOfLastMonth),
        lte(payments.createdAt, endOfLastMonth),
      )),
    db.select({ total: sql<number>`coalesce(sum(sp.price), 0)` })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, 'active')),
    db.select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      cnt: count(),
    })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, startOfMonth))),
    db.select({ cnt: count() })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, startOfMonth))),
    db.select({ cnt: count() })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'cancelled'),
        gte(subscriptions.createdAt, startOfMonth),
      )),
    db.select({ cnt: count() })
      .from(subscriptions)
      .where(lt(subscriptions.createdAt, startOfMonth)),
    db.select({
      provider: payments.provider,
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      cnt: count(),
    })
      .from(payments)
      .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, startOfMonth)))
      .groupBy(payments.provider),
  ]);

  const revenueMonth = Number(revThisMonth[0]?.total ?? 0);
  const revenueLastMonth = Number(revLastMonth[0]?.total ?? 0);
  const revenueGrowthPercent = revenueLastMonth > 0
    ? Math.round((revenueMonth - revenueLastMonth) / revenueLastMonth * 100)
    : 0;
  const mrr = Number(mrrResult[0]?.total ?? 0);
  const totalCnt = Number(avgCheckResult[0]?.cnt ?? 0);
  const avgCheck = totalCnt > 0 ? Math.round(revenueMonth / totalCnt) : 0;
  const cancelledCnt = Number(cancelledThisMonth[0]?.cnt ?? 0);
  const activeAtStart = Number(activeSubsStart[0]?.cnt ?? 1);
  const churnRate = Math.round((cancelledCnt / activeAtStart) * 100 * 10) / 10;

  // 12-month chart by source
  const monthlyChart = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN type = 'subscription' THEN amount ELSE 0 END), 0) AS subscription,
      COALESCE(SUM(CASE WHEN type = 'consultation' THEN amount ELSE 0 END), 0) AS consultation,
      COALESCE(SUM(CASE WHEN type = 'pharmacy_order' THEN amount ELSE 0 END), 0) AS pharmacy_order,
      COALESCE(SUM(CASE WHEN type = 'booking' THEN amount ELSE 0 END), 0) AS booking,
      COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE status = 'completed'
      AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `);

  const last12Months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    last12Months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const chartMap = new Map<string, { subscription: number; consultation: number; pharmacy_order: number; booking: number; total: number }>();
  for (const row of Array.from(monthlyChart) as Array<Record<string, unknown>>) {
    const month = String(row.month ?? '').slice(0, 7);
    chartMap.set(month, {
      subscription: Number(row.subscription ?? 0),
      consultation: Number(row.consultation ?? 0),
      pharmacy_order: Number(row.pharmacy_order ?? 0),
      booking: Number(row.booking ?? 0),
      total: Number(row.total ?? 0),
    });
  }

  const monthlyChartFilled = last12Months.map(month => ({
    month,
    ...(chartMap.get(month) ?? { subscription: 0, consultation: 0, pharmacy_order: 0, booking: 0, total: 0 }),
  }));

  return c.json({
    kpis: {
      revenueMonth,
      revenueGrowthPercent,
      mrr,
      avgCheck,
      churnRate,
    },
    monthlyChart: monthlyChartFilled,
    byProvider: byProvider.map(p => ({
      provider: p.provider ?? 'other',
      total: Number(p.total),
      cnt: Number(p.cnt),
    })),
  });
});

// ─── GET /v1/admin/finance/dashboard (legacy) ─────────────────────────────────

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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyRevenue = await db.select({
    date: sql<string>`date_trunc('day', created_at)::date`,
    total: sql<number>`coalesce(sum(amount), 0)`,
  })
    .from(payments)
    .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, thirtyDaysAgo)))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  const byType = await db.select({
    type: payments.type,
    total: sql<number>`coalesce(sum(amount), 0)`,
    cnt: sql<number>`count(*)`,
  })
    .from(payments)
    .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, since)))
    .groupBy(payments.type);

  const byProvider = await db.select({
    provider: payments.provider,
    total: sql<number>`coalesce(sum(amount), 0)`,
    cnt: sql<number>`count(*)`,
  })
    .from(payments)
    .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, since)))
    .groupBy(payments.provider);

  const byPlan = await db.select({
    planName: subscriptionPlans.name,
    planSlug: subscriptionPlans.slug,
    cnt: sql<number>`count(*)`,
  })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.status, 'active'))
    .groupBy(subscriptionPlans.name, subscriptionPlans.slug);

  const totalRev = Number(totalRevenue[0]?.total ?? 0);
  const totalCnt = Number(totalPayments[0]?.cnt ?? 0);
  const avgCheck = totalCnt > 0 ? Math.round(totalRev / totalCnt) : 0;

  return c.json({
    revenue: { total: totalRev, subscription: Number(subscriptionRevenue[0]?.total ?? 0), avgCheck },
    activeSubscriptions: Number(activeSubscriptions[0]?.cnt ?? 0),
    totalPayments: totalCnt,
    dailyRevenue,
    byType,
    byProvider,
    byPlan,
  });
});

// ─── GET /v1/admin/finance/payments/export ────────────────────────────────────

adminFinanceRouter.get('/payments/export', async (c) => {
  const { dateFrom, dateTo, status, provider, type } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(payments.status, status));
  if (provider) conditions.push(eq(payments.provider, provider));
  if (type) conditions.push(eq(payments.type, type));
  if (dateFrom) conditions.push(gte(payments.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(payments.createdAt, new Date(dateTo)));

  const rows = await db.select({
    id: payments.id,
    userName: aivitaUsers.name,
    userEmail: aivitaUsers.email,
    type: payments.type,
    amount: payments.amount,
    currency: payments.currency,
    provider: payments.provider,
    status: payments.status,
    providerTransactionId: payments.providerTransactionId,
    createdAt: payments.createdAt,
    completedAt: payments.completedAt,
  })
    .from(payments)
    .leftJoin(aivitaUsers, eq(payments.userId, aivitaUsers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(payments.createdAt))
    .limit(10000);

  const TYPE_LABELS: Record<string, string> = {
    subscription: 'Подписка', consultation: 'Консультация',
    pharmacy_order: 'Аптека', booking: 'Запись',
  };
  const STATUS_LABELS: Record<string, string> = {
    completed: 'Оплачено', failed: 'Ошибка', pending: 'Ожидает',
    refunded: 'Возврат', processing: 'Обработка',
  };

  const csvHeader = 'ID,Пользователь,Email,Тип,Сумма,Валюта,Провайдер,Статус,Транзакция,Дата\r\n';
  const csvRows = rows.map(r => [
    r.id,
    `"${(r.userName ?? '').replace(/"/g, '""')}"`,
    `"${(r.userEmail ?? '').replace(/"/g, '""')}"`,
    TYPE_LABELS[r.type] ?? r.type,
    r.amount,
    r.currency,
    r.provider ?? '',
    STATUS_LABELS[r.status] ?? r.status,
    r.providerTransactionId ?? '',
    r.createdAt.toISOString(),
  ].join(',')).join('\r\n');

  const filename = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  return c.body('﻿' + csvHeader + csvRows);
});

// ─── GET /v1/admin/finance/payments ──────────────────────────────────────────

adminFinanceRouter.get('/payments', async (c) => {
  const { status, provider, type, from, to, dateFrom, dateTo, page = '1', limit = '50' } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (status) conditions.push(eq(payments.status, status));
  if (provider) conditions.push(eq(payments.provider, provider));
  if (type) conditions.push(eq(payments.type, type));
  if (from || dateFrom) conditions.push(gte(payments.createdAt, new Date(from ?? dateFrom!)));
  if (to || dateTo) conditions.push(lte(payments.createdAt, new Date(to ?? dateTo!)));

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

// ─── GET /v1/admin/finance/payments/:id ──────────────────────────────────────

adminFinanceRouter.get('/payments/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const [row] = await db.select({
    payment: payments,
    userName: aivitaUsers.name,
    userEmail: aivitaUsers.email,
  })
    .from(payments)
    .leftJoin(aivitaUsers, eq(payments.userId, aivitaUsers.id))
    .where(eq(payments.id, id))
    .limit(1);

  if (!row) return c.json({ error: 'Payment not found' }, 404);
  return c.json({ data: row });
});

// ─── POST /v1/admin/finance/payments/:id/refund ───────────────────────────────

adminFinanceRouter.post('/payments/:id/refund', async (c) => {
  const id = parseInt(c.req.param('id'));
  let reason = '';
  try {
    const body = await c.req.json() as { reason?: string };
    reason = body.reason ?? '';
  } catch {}

  const [existing] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Payment not found' }, 404);
  if (existing.status !== 'completed') return c.json({ error: 'Only completed payments can be refunded' }, 400);

  await db.update(payments)
    .set({
      status: 'refunded',
      metadata: { ...(existing.metadata ?? {}), refundReason: reason, refundedAt: new Date().toISOString() },
    })
    .where(eq(payments.id, id));
  return c.json({ success: true });
});

// ─── GET /v1/admin/finance/subscriptions/overview ────────────────────────────

adminFinanceRouter.get('/subscriptions/overview', async (c) => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [activeResult, newThisMonthResult, cancelledThisMonthResult, mrrResult] = await Promise.all([
    db.select({ cnt: count() }).from(subscriptions).where(eq(subscriptions.status, 'active')),
    db.select({ cnt: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, 'active'), gte(subscriptions.createdAt, startOfMonth))),
    db.select({ cnt: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, 'cancelled'), gte(subscriptions.createdAt, startOfMonth))),
    db.select({ total: sql<number>`coalesce(sum(sp.price), 0)` })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, 'active')),
  ]);

  const active = Number(activeResult[0]?.cnt ?? 0);
  const newThisMonth = Number(newThisMonthResult[0]?.cnt ?? 0);
  const cancelledThisMonth = Number(cancelledThisMonthResult[0]?.cnt ?? 0);
  const conversionRate = active > 0 ? Math.round((newThisMonth / active) * 100 * 10) / 10 : 0;
  const mrr = Number(mrrResult[0]?.total ?? 0);

  // 12-month subscription chart
  const monthlyRaw = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status IN ('active','expired','cancelled','past_due')) AS new_subs,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
    FROM subscriptions
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `);

  const last12Months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    last12Months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const chartMap = new Map<string, { active: number; new_subs: number; cancelled: number }>();
  for (const row of Array.from(monthlyRaw) as Array<Record<string, unknown>>) {
    const month = String(row.month ?? '').slice(0, 7);
    chartMap.set(month, {
      active: Number(row.active ?? 0),
      new_subs: Number(row.new_subs ?? 0),
      cancelled: Number(row.cancelled ?? 0),
    });
  }

  const monthlyChart = last12Months.map(month => ({
    month,
    ...(chartMap.get(month) ?? { active: 0, new_subs: 0, cancelled: 0 }),
  }));

  return c.json({ active, newThisMonth, cancelledThisMonth, conversionRate, mrr, monthlyChart });
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
