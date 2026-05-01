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
} from '@medsoft/db';
import {
  eq, ilike, or, and, isNull, desc, asc, gte, lte, lt, gte as sqlGte,
  sql, count, avg, inArray,
} from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

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

export { router as aivitaAdminRouter };
