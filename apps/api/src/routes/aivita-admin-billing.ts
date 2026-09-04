/**
 * Split out of aivita-admin.ts (docs/routes-split-plan.md) — the
 * "aivita:billing_read/manage" group (5 routes). Still mounted at
 * /v1/aivita-admin, so external paths are unchanged. No permission
 * checks added here.
 *
 * NOTE (docs/rbac-model.md footnote⁴): POST/PATCH /billing/plans write the
 * same `subscriptionPlans` table as admin/finance.ts's `PATCH /plans/:id`
 * (right `finance:prices_manage`) — pre-existing duplication, carried over
 * unchanged by this split.
 */
import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { aivitaUsers, subscriptionPlans, subscriptions, payments } from '@medsoft/db';
import { eq, and, asc, desc, count, gte, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from './aivita-admin-audit.js';

const router = new Hono();
router.use('*', requireAuth);

// GET /v1/aivita-admin/billing/plans
router.get('/billing/plans', async (c) => {
  const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.price));
  return c.json({ data: plans });
});

// POST /v1/aivita-admin/billing/plans
router.post('/billing/plans', async (c) => {
  const adminId = c.get('adminId') as string;
  const body = await c.req.json() as {
    name: string; slug: string; price: number; period: string;
    targetRole: string; features?: string[];
  };

  const [plan] = await db.insert(subscriptionPlans).values({
    name: body.name,
    slug: body.slug,
    price: body.price,
    period: body.period,
    targetRole: body.targetRole,
    features: body.features ?? [],
    isActive: true,
  }).returning();

  await auditLog(adminId, 'billing_plan_create', 'subscription_plan', String(plan.id), body as Record<string, unknown>, c.req);
  return c.json({ data: plan });
});

// PATCH /v1/aivita-admin/billing/plans/:id
router.patch('/billing/plans/:id', async (c) => {
  const adminId = c.get('adminId') as string;
  const id = Number(c.req.param('id'));
  const body = await c.req.json() as Partial<{ name: string; price: number; period: string; features: string[]; isActive: boolean }>;

  const [updated] = await db.update(subscriptionPlans)
    .set(body)
    .where(eq(subscriptionPlans.id, id))
    .returning();

  await auditLog(adminId, 'billing_plan_update', 'subscription_plan', String(id), body as Record<string, unknown>, c.req);
  return c.json({ data: updated });
});

// GET /v1/aivita-admin/billing/subscriptions
router.get('/billing/subscriptions', async (c) => {
  const { page = '1', status = '' } = c.req.query();
  const offset = (Number(page) - 1) * 25;

  const conds = [];
  if (status) conds.push(eq(subscriptions.status, status));

  const rows = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      userName: aivitaUsers.name,
      userEmail: aivitaUsers.email,
      planId: subscriptions.planId,
      planName: subscriptionPlans.name,
      planPrice: subscriptionPlans.price,
      status: subscriptions.status,
      startedAt: subscriptions.startedAt,
      expiresAt: subscriptions.expiresAt,
      autoRenew: subscriptions.autoRenew,
    })
    .from(subscriptions)
    .innerJoin(aivitaUsers, eq(subscriptions.userId, aivitaUsers.id))
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(subscriptions.startedAt))
    .limit(25)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(subscriptions)
    .where(conds.length > 0 ? and(...conds) : undefined);

  return c.json({ data: rows, total });
});

// GET /v1/aivita-admin/billing/stats — revenue overview
router.get('/billing/stats', async (c) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalRow] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.status, 'completed')));

  const [monthRow] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, monthStart)));

  const [activeSubs] = await db
    .select({ cnt: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'));

  return c.json({
    data: {
      totalRevenue: Number(totalRow.total),
      monthRevenue: Number(monthRow.total),
      activeSubscriptions: activeSubs.cnt,
    },
  });
});

export { router as aivitaAdminBillingRouter };
