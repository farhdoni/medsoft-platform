/**
 * Aivita Admin API
 * All routes require admin authentication.
 * Audit log written for sensitive actions (view_chat, deactivate, delete, export).
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  habits,
  habitLogs,
  chatSessions,
  chatMessages,
  healthScores,
  auditLogs,
  doctorProfiles,
  subscriptionPlans,
  subscriptions,
  payments,
  platformSettings,
} from '@medsoft/db';
import {
  eq, ilike, or, and, isNull, desc, asc, gte, lte, lt, gte as sqlGte,
  sql, count, avg, inArray,
} from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'crypto';

const router = new Hono();
router.use('*', requireAuth);

// ─── Helper: write audit log ──────────────────────────────────────────────────

async function auditLog(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
  req?: { header: (k: string) => string | undefined },
) {
  await db.insert(auditLogs).values({
    actorAdminId: adminId,
    action,
    entityType: targetType,
    entityId: targetId ?? undefined,
    metadata: metadata ?? null,
    actorIp: req?.header('x-forwarded-for') ?? req?.header('x-real-ip') ?? null,
    actorUserAgent: req?.header('user-agent') ?? null,
  }).catch(() => {}); // non-fatal
}

// ─── Helper: period SQL filter ────────────────────────────────────────────────

function periodStart(period: string): Date {
  const now = Date.now();
  switch (period) {
    case '7d':  return new Date(now - 7  * 86400_000);
    case '30d': return new Date(now - 30 * 86400_000);
    case '90d': return new Date(now - 90 * 86400_000);
    default:    return new Date(0); // all time
  }
}

// ─── A. LIST aivita users ─────────────────────────────────────────────────────

const listQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(25),
  search:     z.string().optional(),
  filter:     z.enum(['all', 'active', 'inactive', 'deleted']).default('all'),
  dateRange:  z.enum(['today', 'week', 'month', 'all']).default('all'),
  scoreRange: z.enum(['low', 'mid', 'high', 'all']).default('all'),
  sort:       z.enum(['name', 'email', 'created_at', 'last_login_at']).default('created_at'),
  order:      z.enum(['asc', 'desc']).default('desc'),
});

router.get('/users', zValidator('query', listQuerySchema), async (c) => {
  const { page, limit, search, filter, dateRange, scoreRange, sort, order } = c.req.valid('query');
  const offset = (page - 1) * limit;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);

  // Build conditions
  const conds: ReturnType<typeof eq>[] = [];

  if (filter === 'active')   conds.push(and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.lastLoginAt, sevenDaysAgo))!);
  if (filter === 'inactive') conds.push(and(isNull(aivitaUsers.deletedAt), or(isNull(aivitaUsers.lastLoginAt), lt(aivitaUsers.lastLoginAt, sevenDaysAgo))!)!);
  if (filter === 'deleted')  conds.push(sql`${aivitaUsers.deletedAt} IS NOT NULL`);
  if (filter === 'all')      conds.push(isNull(aivitaUsers.deletedAt));

  if (search) {
    conds.push(or(
      ilike(aivitaUsers.name, `%${search}%`),
      ilike(aivitaUsers.email, `%${search}%`),
      ilike(aivitaUsers.nickname, `%${search}%`),
    )!);
  }

  if (dateRange === 'today') {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    conds.push(gte(aivitaUsers.createdAt, todayStart));
  } else if (dateRange === 'week') {
    conds.push(gte(aivitaUsers.createdAt, new Date(Date.now() - 7 * 86400_000)));
  } else if (dateRange === 'month') {
    conds.push(gte(aivitaUsers.createdAt, new Date(Date.now() - 30 * 86400_000)));
  }

  const where = conds.length > 0 ? and(...conds) : undefined;

  // Sorting
  const sortCol = {
    name: aivitaUsers.name,
    email: aivitaUsers.email,
    created_at: aivitaUsers.createdAt,
    last_login_at: aivitaUsers.lastLoginAt,
  }[sort];
  const orderFn = order === 'asc' ? asc : desc;

  // Fetch users + latest health score via subquery
  const users = await db
    .select({
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      nickname: aivitaUsers.nickname,
      email: aivitaUsers.email,
      onboardingCompleted: aivitaUsers.onboardingCompleted,
      emailVerified: aivitaUsers.emailVerified,
      lastLoginAt: aivitaUsers.lastLoginAt,
      createdAt: aivitaUsers.createdAt,
      deletedAt: aivitaUsers.deletedAt,
      locale: aivitaUsers.locale,
      provider: aivitaUsers.provider,
    })
    .from(aivitaUsers)
    .where(where)
    .orderBy(sortCol ? orderFn(sortCol) : desc(aivitaUsers.createdAt))
    .limit(limit)
    .offset(offset);

  // Get health scores for these users in one query
  const userIds = users.map((u) => u.id);
  const scores = userIds.length > 0
    ? await db
        .select({
          userId: healthScores.userId,
          totalScore: healthScores.totalScore,
          calculatedAt: healthScores.calculatedAt,
        })
        .from(healthScores)
        .where(inArray(healthScores.userId, userIds))
        .orderBy(desc(healthScores.calculatedAt))
    : [];

  // Build latest score map
  const latestScore: Record<string, number | null> = {};
  for (const s of scores) {
    if (!latestScore[s.userId]) latestScore[s.userId] = s.totalScore;
  }

  // Filter by scoreRange after fetching (easier than a JOIN)
  let result = users.map((u) => ({ ...u, healthScore: latestScore[u.id] ?? null }));
  if (scoreRange === 'low')  result = result.filter((u) => u.healthScore !== null && u.healthScore < 50);
  if (scoreRange === 'mid')  result = result.filter((u) => u.healthScore !== null && u.healthScore >= 50 && u.healthScore <= 75);
  if (scoreRange === 'high') result = result.filter((u) => u.healthScore !== null && u.healthScore > 75);

  // Total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(aivitaUsers)
    .where(where);

  return c.json({ data: result, total: Number(total), page, limit });
});

// ─── B. GET user detail ───────────────────────────────────────────────────────

router.get('/users/:id', async (c) => {
  const { id } = c.req.param();
  const adminId = c.get('adminId');

  const user = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.id, id),
  });
  if (!user) return c.json({ error: 'Not found' }, 404);

  // Latest health score
  const latestScore = await db.query.healthScores.findFirst({
    where: eq(healthScores.userId, id),
    orderBy: [desc(healthScores.calculatedAt)],
  });

  // Active habits with last 7d completion rate
  const userHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      emoji: habits.emoji,
      goalType: habits.goalType,
    })
    .from(habits)
    .where(and(eq(habits.userId, id), isNull(habits.archivedAt)));

  // Habit logs last 7 days for streak
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const logs = await db
    .select({ habitId: habitLogs.habitId, date: habitLogs.date })
    .from(habitLogs)
    .where(and(eq(habitLogs.userId, id), gte(habitLogs.loggedAt, sevenDaysAgo)));

  const logsByHabit: Record<string, Set<string>> = {};
  for (const l of logs) {
    if (!logsByHabit[l.habitId]) logsByHabit[l.habitId] = new Set();
    logsByHabit[l.habitId].add(l.date);
  }

  const habitsWithStats = userHabits.map((h) => ({
    ...h,
    completedDays: logsByHabit[h.id]?.size ?? 0,
    completionRate: Math.round(((logsByHabit[h.id]?.size ?? 0) / 7) * 100),
  }));

  // AI chat sessions
  const sessions = await db
    .select({ id: chatSessions.id, title: chatSessions.title, updatedAt: chatSessions.updatedAt })
    .from(chatSessions)
    .where(eq(chatSessions.userId, id))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(5);

  const totalMessages = await db
    .select({ total: count() })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(eq(chatSessions.userId, id));

  await auditLog(adminId, 'view_user', 'aivita_user', id, {}, c.req);

  return c.json({
    user,
    healthScore: latestScore?.totalScore ?? null,
    habits: habitsWithStats,
    chatSummary: {
      sessions: sessions.length,
      totalMessages: Number(totalMessages[0]?.total ?? 0),
      latestSession: sessions[0] ?? null,
    },
  });
});

// ─── C. GET user chat history ─────────────────────────────────────────────────

router.get('/users/:id/chat', async (c) => {
  const { id } = c.req.param();
  const adminId = c.get('adminId');

  const sessions = await db
    .select({ id: chatSessions.id, title: chatSessions.title, createdAt: chatSessions.createdAt, updatedAt: chatSessions.updatedAt })
    .from(chatSessions)
    .where(eq(chatSessions.userId, id))
    .orderBy(desc(chatSessions.updatedAt));

  const sessionIds = sessions.map((s) => s.id);
  const messages = sessionIds.length > 0
    ? await db
        .select({
          id: chatMessages.id,
          sessionId: chatMessages.sessionId,
          role: chatMessages.role,
          content: chatMessages.content,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(inArray(chatMessages.sessionId, sessionIds))
        .orderBy(asc(chatMessages.createdAt))
    : [];

  // Group messages by session
  const bySession: Record<string, typeof messages> = {};
  for (const m of messages) {
    if (!bySession[m.sessionId]) bySession[m.sessionId] = [];
    bySession[m.sessionId].push(m);
  }

  const result = sessions.map((s) => ({ ...s, messages: bySession[s.id] ?? [] }));

  await auditLog(adminId, 'view_chat', 'aivita_user', id, { sessionCount: sessions.length }, c.req);

  return c.json({ data: result });
});

// ─── D. UPDATE user (deactivate / reactivate) ────────────────────────────────

const patchUserSchema = z.object({
  deletedAt: z.string().nullable().optional(),
  name: z.string().optional(),
}).strict();

router.patch('/users/:id', zValidator('json', patchUserSchema), async (c) => {
  const { id } = c.req.param();
  const adminId = c.get('adminId');
  const body = c.req.valid('json');

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if ('deletedAt' in body) {
    updates.deletedAt = body.deletedAt ? new Date(body.deletedAt) : null;
  }
  if (body.name) updates.name = body.name;

  const [updated] = await db
    .update(aivitaUsers)
    .set(updates)
    .where(eq(aivitaUsers.id, id))
    .returning({ id: aivitaUsers.id, deletedAt: aivitaUsers.deletedAt });

  if (!updated) return c.json({ error: 'Not found' }, 404);

  const action = body.deletedAt ? 'deactivate_user' : 'reactivate_user';
  await auditLog(adminId, action, 'aivita_user', id, {}, c.req);

  return c.json({ data: updated });
});

// ─── E. DELETE user (soft delete) ────────────────────────────────────────────

router.delete('/users/:id', async (c) => {
  const { id } = c.req.param();
  const adminId = c.get('adminId');

  const [updated] = await db
    .update(aivitaUsers)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(aivitaUsers.id, id), isNull(aivitaUsers.deletedAt)))
    .returning({ id: aivitaUsers.id });

  if (!updated) return c.json({ error: 'Not found or already deleted' }, 404);

  await auditLog(adminId, 'delete_user', 'aivita_user', id, {}, c.req);

  return c.json({ data: { deleted: true } });
});

// ─── F. EXPORT user data (GDPR) ──────────────────────────────────────────────

router.post('/users/:id/export', async (c) => {
  const { id } = c.req.param();
  const adminId = c.get('adminId');

  const [user, userHabits, userHabitLogs, sessions] = await Promise.all([
    db.query.aivitaUsers.findFirst({ where: eq(aivitaUsers.id, id) }),
    db.select().from(habits).where(eq(habits.userId, id)),
    db.select().from(habitLogs).where(eq(habitLogs.userId, id)),
    db.select().from(chatSessions).where(eq(chatSessions.userId, id)),
  ]);

  if (!user) return c.json({ error: 'Not found' }, 404);

  const sessionIds = sessions.map((s) => s.id);
  const messages = sessionIds.length > 0
    ? await db.select().from(chatMessages).where(inArray(chatMessages.sessionId, sessionIds))
    : [];

  await auditLog(adminId, 'export_user', 'aivita_user', id, {}, c.req);

  return c.json({
    exportedAt: new Date().toISOString(),
    user: { ...user, passwordHash: '[REDACTED]' },
    habits: userHabits,
    habitLogs: userHabitLogs,
    chatSessions: sessions,
    chatMessages: messages,
  });
});

// ─── G. DASHBOARD metrics ─────────────────────────────────────────────────────

const dashboardSchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
});

router.get('/dashboard', zValidator('query', dashboardSchema), async (c) => {
  const { period } = c.req.valid('query');
  const start = periodStart(period);
  const prevStart = new Date(start.getTime() - (Date.now() - start.getTime())); // double the period back

  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const oneDayAgo = new Date(Date.now() - 86400_000);

  const [
    totalUsers,
    newUsers,
    prevNewUsers,
    dau,
    onboarded,
    returnedUsers,
  ] = await Promise.all([
    // Total non-deleted users
    db.select({ total: count() }).from(aivitaUsers).where(isNull(aivitaUsers.deletedAt)),
    // New users in period
    db.select({ total: count() }).from(aivitaUsers).where(and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.createdAt, start))),
    // New users in prev period (for trend)
    db.select({ total: count() }).from(aivitaUsers).where(and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.createdAt, prevStart), lte(aivitaUsers.createdAt, start))),
    // DAU (active last 24h)
    db.select({ total: count() }).from(aivitaUsers).where(and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.lastLoginAt, oneDayAgo))),
    // Onboarding completion rate
    db.select({ total: count() }).from(aivitaUsers).where(and(isNull(aivitaUsers.deletedAt), eq(aivitaUsers.onboardingCompleted, true))),
    // Returned in 7 days (approx: logged in within 7d of registration)
    db.select({ total: count() }).from(aivitaUsers).where(and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.lastLoginAt, sevenDaysAgo))),
  ]);

  // AI requests (user chat messages) in period
  const aiRequests = await db
    .select({ total: count() })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatMessages.role, 'user'), gte(chatMessages.createdAt, start)));

  const prevAiRequests = await db
    .select({ total: count() })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatMessages.role, 'user'), gte(chatMessages.createdAt, prevStart), lte(chatMessages.createdAt, start)));

  // Registrations chart: group by date (last 30 days regardless of period)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
  const regChart = await db
    .select({
      date: sql<string>`date_trunc('day', ${aivitaUsers.createdAt})::date::text`,
      count: count(),
    })
    .from(aivitaUsers)
    .where(and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.createdAt, thirtyDaysAgo)))
    .groupBy(sql`date_trunc('day', ${aivitaUsers.createdAt})`)
    .orderBy(sql`date_trunc('day', ${aivitaUsers.createdAt})`);

  // Health score distribution
  const scoreDistRaw = await db
    .select({
      range: sql<string>`
        CASE
          WHEN ${healthScores.totalScore} < 30 THEN '<30'
          WHEN ${healthScores.totalScore} < 50 THEN '30-50'
          WHEN ${healthScores.totalScore} < 70 THEN '50-70'
          WHEN ${healthScores.totalScore} < 90 THEN '70-90'
          ELSE '>90'
        END`,
      count: count(),
    })
    .from(healthScores)
    .innerJoin(
      sql`(SELECT DISTINCT ON (user_id) id FROM health_scores ORDER BY user_id, calculated_at DESC) latest`,
      sql`latest.id = ${healthScores.id}`,
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  // Top AI questions (first 60 chars of user messages, grouped)
  const topQuestions = await db
    .select({
      question: sql<string>`LEFT(${chatMessages.content}, 60)`,
      count: count(),
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.role, 'user'), gte(chatMessages.createdAt, start)))
    .groupBy(sql`LEFT(${chatMessages.content}, 60)`)
    .orderBy(desc(count()))
    .limit(10);

  // Trends
  const newNow  = Number(newUsers[0]?.total ?? 0);
  const newPrev = Number(prevNewUsers[0]?.total ?? 0);
  const aiNow   = Number(aiRequests[0]?.total ?? 0);
  const aiPrev  = Number(prevAiRequests[0]?.total ?? 0);

  function trend(now: number, prev: number): number {
    if (prev === 0) return now > 0 ? 100 : 0;
    return Math.round(((now - prev) / prev) * 100);
  }

  const totalU    = Number(totalUsers[0]?.total ?? 0);
  const onboardedU = Number(onboarded[0]?.total ?? 0);

  return c.json({
    metrics: {
      totalUsers:    totalU,
      newUsers:      newNow,
      dau:           Number(dau[0]?.total ?? 0),
      aiRequests:    aiNow,
      trends: {
        newUsers:   trend(newNow, newPrev),
        aiRequests: trend(aiNow, aiPrev),
      },
    },
    funnel: {
      registered:   totalU,
      onboarded:    onboardedU,
      onboardRate:  totalU > 0 ? Math.round((onboardedU / totalU) * 100) : 0,
      activeWeek:   Number(returnedUsers[0]?.total ?? 0),
      retentionRate: totalU > 0 ? Math.round((Number(returnedUsers[0]?.total ?? 0) / totalU) * 100) : 0,
    },
    registrationsChart: regChart,
    healthDistribution: scoreDistRaw,
    topAiQuestions: topQuestions,
  });
});

// ─── H. Force verify email (admin tool) ──────────────────────────────────────

router.post('/users/:id/verify-email', async (c) => {
  const { id } = c.req.param();
  const adminId = c.get('adminId');

  const user = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.id, id),
  });

  if (!user) return c.json({ error: 'Not found' }, 404);

  const now = new Date();
  await db.update(aivitaUsers)
    .set({ emailVerified: now, updatedAt: now })
    .where(eq(aivitaUsers.id, id));

  await auditLog(adminId, 'force_verify_email', 'aivita_user', id, {}, c.req);

  return c.json({ data: { verified: true, userId: id } });
});

// ─── I. Get user subscription ─────────────────────────────────────────────────

router.get('/users/:id/subscription', async (c) => {
  const { id } = c.req.param();

  const sub = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      startedAt: subscriptions.startedAt,
      expiresAt: subscriptions.expiresAt,
      autoRenew: subscriptions.autoRenew,
      planId: subscriptions.planId,
      planName: subscriptionPlans.name,
      planSlug: subscriptionPlans.slug,
      planPrice: subscriptionPlans.price,
      planPeriod: subscriptionPlans.period,
    })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(and(eq(subscriptions.userId, id), eq(subscriptions.status, 'active')))
    .orderBy(desc(subscriptions.startedAt))
    .limit(1);

  const plans = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true))
    .orderBy(asc(subscriptionPlans.price));

  return c.json({ data: { subscription: sub[0] ?? null, plans } });
});

// ─── J. Assign / change subscription (admin override, no payment) ─────────────

router.post('/users/:id/subscription', async (c) => {
  const { id } = c.req.param();
  const adminId = c.get('adminId') as string;
  const body = await c.req.json() as { planId: number; months?: number };

  const user = await db.query.aivitaUsers.findFirst({ where: eq(aivitaUsers.id, id) });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, body.planId));
  if (!plan) return c.json({ error: 'Plan not found' }, 404);

  const now = new Date();
  const expiresAt = new Date(now);
  const months = body.months ?? (plan.period === 'annual' ? 12 : 1);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  // Cancel existing active subscriptions
  await db.update(subscriptions)
    .set({ status: 'cancelled' })
    .where(and(eq(subscriptions.userId, id), eq(subscriptions.status, 'active')));

  const [sub] = await db.insert(subscriptions).values({
    userId: id,
    planId: plan.id,
    status: 'active',
    paymentMethodId: null,
    startedAt: now,
    expiresAt,
    autoRenew: false,
  }).returning();

  // Sync user.plan field
  const planToTier: Record<string, string> = {
    free: 'free',
    premium: 'premium',
    'premium-family': 'premium',
    annual: 'premium',
  };
  await db.update(aivitaUsers)
    .set({ plan: planToTier[plan.slug] ?? 'free', updatedAt: now })
    .where(eq(aivitaUsers.id, id));

  await auditLog(adminId, 'admin_assign_subscription', 'subscription', String(sub.id), { planId: plan.id, planSlug: plan.slug, months }, c.req);

  return c.json({ data: { subscription: sub, plan } });
});


// ══════════════════════════════════════════════════════════════════════════════
// AIVITA DOCTORS MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /v1/aivita-admin/aivita-doctors — list all aivita doctors
router.get('/aivita-doctors', async (c) => {
  const { page = '1', limit = '25', search = '', status = '' } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);

  const conds = [];
  if (search) conds.push(ilike(aivitaUsers.name, `%${search}%`));
  if (status) conds.push(eq(doctorProfiles.verificationStatus, status));

  const rows = await db
    .select({
      userId: doctorProfiles.userId,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      phone: aivitaUsers.phone,
      specialization: doctorProfiles.specialization,
      city: doctorProfiles.city,
      verificationStatus: doctorProfiles.verificationStatus,
      diplomaVerified: doctorProfiles.diplomaVerified,
      licenseVerified: doctorProfiles.licenseVerified,
      showInCatalog: doctorProfiles.showInCatalog,
      isActive: doctorProfiles.isActive,
      rating: doctorProfiles.rating,
      totalConsultations: doctorProfiles.totalConsultations,
      consultationPrice: doctorProfiles.consultationPrice,
      createdAt: doctorProfiles.createdAt,
      verifiedAt: doctorProfiles.verifiedAt,
      rejectionReason: doctorProfiles.rejectionReason,
    })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(doctorProfiles.createdAt))
    .limit(Number(limit))
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(conds.length > 0 ? and(...conds) : undefined);

  return c.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

// GET /v1/aivita-admin/aivita-doctors/:id — single doctor full profile
router.get('/aivita-doctors/:id', async (c) => {
  const { id } = c.req.param();

  const [row] = await db
    .select({
      profile: doctorProfiles,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      phone: aivitaUsers.phone,
      avatarUrl: aivitaUsers.avatarUrl,
    })
    .from(doctorProfiles)
    .innerJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
    .where(eq(doctorProfiles.userId, id))
    .limit(1);

  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

// PATCH /v1/aivita-admin/aivita-doctors/:id/verify — approve or reject
router.patch('/aivita-doctors/:id/verify', async (c) => {
  const adminId = c.get('adminId') as string;
  const { id } = c.req.param();
  const { action, reason } = await c.req.json() as { action: 'approve' | 'reject'; reason?: string };

  if (!['approve', 'reject'].includes(action)) {
    return c.json({ error: 'action must be approve or reject' }, 400);
  }

  const verificationStatus = action === 'approve' ? 'verified' : 'rejected';
  const now = new Date();

  await db.update(doctorProfiles)
    .set({
      verificationStatus,
      verifiedAt: action === 'approve' ? now : null,
      verifiedBy: action === 'approve' ? adminId : null,
      rejectionReason: action === 'reject' ? (reason ?? 'Отклонено администратором') : null,
      updatedAt: now,
    })
    .where(eq(doctorProfiles.userId, id));

  await auditLog(adminId, `doctor_${action}`, 'doctor_profile', id, { reason }, c.req);

  return c.json({ data: { verificationStatus, userId: id } });
});

// PATCH /v1/aivita-admin/aivita-doctors/:id/catalog — toggle showInCatalog / isActive
router.patch('/aivita-doctors/:id/catalog', async (c) => {
  const adminId = c.get('adminId') as string;
  const { id } = c.req.param();
  const body = await c.req.json() as { showInCatalog?: boolean; isActive?: boolean };

  await db.update(doctorProfiles)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(doctorProfiles.userId, id));

  await auditLog(adminId, 'doctor_catalog_update', 'doctor_profile', id, body as Record<string, unknown>, c.req);

  return c.json({ data: { updated: true } });
});

// POST /v1/aivita-admin/aivita-doctors — create a doctor account (admin)
router.post('/aivita-doctors', async (c) => {
  const adminId = c.get('adminId') as string;
  const body = await c.req.json() as {
    name: string;
    email: string;
    phone?: string;
    specialization?: string;
    password?: string;
  };

  const { name, email, phone, specialization, password: providedPassword } = body;
  if (!name?.trim() || !email?.trim()) {
    return c.json({ error: 'name and email are required' }, 400);
  }

  // Check email uniqueness
  const existing = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.email, email.trim().toLowerCase()),
  });
  if (existing) return c.json({ error: 'email_taken' }, 409);

  // Generate password if not provided
  const plainPassword = providedPassword?.trim() || randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  // Generate unique nickname
  const base = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'doctor';
  const suffix = randomInt(1000, 9999);
  const nickname = `${base}_${suffix}`;

  const now = new Date();

  const [user] = await db.insert(aivitaUsers).values({
    email: email.trim().toLowerCase(),
    nickname,
    name: name.trim(),
    passwordHash,
    provider: 'email',
    locale: 'ru',
    role: 'doctor',
    plan: 'free',
    referralCode: `DR${suffix}`,
    emailVerified: now, // auto-verify since admin created
  }).returning();

  await db.insert(doctorProfiles).values({
    userId: user.id,
    specialization: specialization?.trim() ?? null,
    phone: phone?.trim() ?? null,
    verificationStatus: 'not_verified',
  });

  await auditLog(adminId, 'doctor_create', 'aivita_user', user.id, { email, name, specialization }, c.req);

  return c.json({
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
      password: plainPassword,
      specialization: specialization ?? null,
    },
  }, 201);
});

// ══════════════════════════════════════════════════════════════════════════════
// BILLING — subscription plans & subscriptions
// ══════════════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════════════
// HOME SETTINGS — app home page configuration
// ══════════════════════════════════════════════════════════════════════════════

const HOME_DEFAULTS: Record<string, string> = {
  aivita_home_show_doctors: 'true',
  aivita_home_show_ai_checkup: 'true',
  aivita_home_announcement_text: '',
  aivita_home_announcement_active: 'false',
  aivita_home_announcement_color: '#6BA3D6',
  aivita_home_hero_greeting_ru: 'Добро пожаловать',
  aivita_home_hero_greeting_uz: 'Xush kelibsiz',
  aivita_doctor_home_hero_sub_ru: 'Ваш AI-кабинет врача',
  aivita_doctor_home_hero_sub_uz: 'Shifokor AI kabinetingiz',
  aivita_home_maintenance: 'false',
  aivita_home_maintenance_msg: 'Проводятся технические работы',
};

// GET /v1/aivita-admin/home-settings
router.get('/home-settings', async (c) => {
  const rows = await db.select().from(platformSettings)
    .where(sql`${platformSettings.key} LIKE 'aivita_%'`);
  const map: Record<string, string> = { ...HOME_DEFAULTS };
  for (const r of rows) if (r.key) map[r.key] = r.value ?? '';
  return c.json({ data: map });
});

// PUT /v1/aivita-admin/home-settings
router.put('/home-settings', async (c) => {
  const adminId = c.get('adminId') as string;
  const body = await c.req.json() as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('aivita_')) continue;
    await db.insert(platformSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
  }
  await auditLog(adminId, 'home_settings_update', 'platform_settings', null, body as Record<string, unknown>, c.req);
  return c.json({ success: true });
});

export { router as aivitaAdminRouter };
