import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { redis } from '../../lib/redis.js';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  doctorProfiles,
  subscriptions,
  subscriptionPlans,
  payments,
} from '@medsoft/db';
import { eq, and, gte, lte, isNull, sql, count, sum, desc } from 'drizzle-orm';

const router = new Hono();

router.use('*', requireAuth);

type DashboardData = {
  usersTotal: number;
  usersActiveToday: number;
  usersGrowthPercent: number;
  doctorsTotal: number;
  doctorsPending: number;
  subscriptionsActive: number;
  mrr: number;
  revenueMonth: number;
  registrationsChart: Array<{ date: string; patients: number; doctors: number }>;
  revenueChart: Array<{ date: string; amount: number }>;
  recentRegistrations: Array<{ id: string; name: string | null; email: string | null; role: string; plan: string; createdAt: string }>;
  pendingDoctors: Array<{ id: string; userId: string; name: string | null; specialization: string | null; createdAt: string }>;
  recentPayments: Array<{ id: number; userId: string; userName: string | null; amount: number; type: string; provider: string | null; status: string; createdAt: string }>;
};

function getLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

router.get('/', async (c) => {
  try {
    const cached = await redis.get('admin:dashboard');
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [
      usersTotalResult,
      usersActiveTodayResult,
      usersLast7Result,
      usersPrev7Result,
      doctorsTotalResult,
      doctorsPendingResult,
      subscriptionsActiveResult,
      revenueMonthResult,
      recentRegistrationsResult,
      pendingDoctorsResult,
      recentPaymentsResult,
    ] = await Promise.all([
      // a) usersTotal
      db.select({ cnt: count() })
        .from(aivitaUsers)
        .where(isNull(aivitaUsers.deletedAt)),

      // b) usersActiveToday
      db.select({ cnt: count() })
        .from(aivitaUsers)
        .where(
          and(
            isNull(aivitaUsers.deletedAt),
            gte(aivitaUsers.lastLoginAt, startOfToday),
          )
        ),

      // c1) usersLast7
      db.select({ cnt: count() })
        .from(aivitaUsers)
        .where(
          and(
            isNull(aivitaUsers.deletedAt),
            gte(aivitaUsers.createdAt, sevenDaysAgo),
          )
        ),

      // c2) usersPrev7
      db.select({ cnt: count() })
        .from(aivitaUsers)
        .where(
          and(
            isNull(aivitaUsers.deletedAt),
            gte(aivitaUsers.createdAt, fourteenDaysAgo),
            lte(aivitaUsers.createdAt, sevenDaysAgo),
          )
        ),

      // d) doctorsTotal
      db.select({ cnt: count() })
        .from(aivitaUsers)
        .where(
          and(
            eq(aivitaUsers.role, 'doctor'),
            isNull(aivitaUsers.deletedAt),
          )
        ),

      // e) doctorsPending
      db.select({ cnt: count() })
        .from(doctorProfiles)
        .where(eq(doctorProfiles.verificationStatus, 'pending')),

      // f) subscriptionsActive
      db.select({ cnt: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active')),

      // g) revenueMonth
      db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.status, 'completed'),
            gte(payments.createdAt, startOfMonth),
          )
        ),

      // h) recentRegistrations
      db.select({
        id: aivitaUsers.id,
        name: aivitaUsers.name,
        email: aivitaUsers.email,
        role: aivitaUsers.role,
        plan: aivitaUsers.plan,
        createdAt: aivitaUsers.createdAt,
      })
        .from(aivitaUsers)
        .where(isNull(aivitaUsers.deletedAt))
        .orderBy(desc(aivitaUsers.createdAt))
        .limit(5),

      // i) pendingDoctors
      db.select({
        id: doctorProfiles.id,
        userId: doctorProfiles.userId,
        name: aivitaUsers.name,
        specialization: doctorProfiles.specialization,
        createdAt: doctorProfiles.createdAt,
      })
        .from(doctorProfiles)
        .leftJoin(aivitaUsers, eq(doctorProfiles.userId, aivitaUsers.id))
        .where(eq(doctorProfiles.verificationStatus, 'pending'))
        .limit(5),

      // j) recentPayments
      db.select({
        id: payments.id,
        userId: payments.userId,
        userName: aivitaUsers.name,
        amount: payments.amount,
        type: payments.type,
        provider: payments.provider,
        status: payments.status,
        createdAt: payments.createdAt,
      })
        .from(payments)
        .leftJoin(aivitaUsers, eq(payments.userId, aivitaUsers.id))
        .orderBy(desc(payments.createdAt))
        .limit(5),
    ]);

    const usersTotal = Number(usersTotalResult[0]?.cnt ?? 0);
    const usersActiveToday = Number(usersActiveTodayResult[0]?.cnt ?? 0);
    const usersLast7 = Number(usersLast7Result[0]?.cnt ?? 0);
    const usersPrev7 = Number(usersPrev7Result[0]?.cnt ?? 0);
    const usersGrowthPercent = usersPrev7 > 0
      ? Math.round((usersLast7 - usersPrev7) / usersPrev7 * 100)
      : 0;
    const doctorsTotal = Number(doctorsTotalResult[0]?.cnt ?? 0);
    const doctorsPending = Number(doctorsPendingResult[0]?.cnt ?? 0);
    const subscriptionsActive = Number(subscriptionsActiveResult[0]?.cnt ?? 0);
    const revenueMonth = Number(revenueMonthResult[0]?.total ?? 0);
    const mrr = revenueMonth;

    // Charts via raw SQL
    const registrationsRaw = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE role = 'patient') as patients,
        COUNT(*) FILTER (WHERE role = 'doctor') as doctors
      FROM aivita_users
      WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    const revenueRaw = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        SUM(amount) as amount
      FROM payments
      WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    const last30Days = getLast30Days();

    // Build registrations chart with zero-fill
    const regMap = new Map<string, { patients: number; doctors: number }>();
    for (const row of Array.from(registrationsRaw) as Array<{ date: unknown; patients: unknown; doctors: unknown }>) {
      const dateStr = row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10);
      regMap.set(dateStr, {
        patients: Number(row.patients ?? 0),
        doctors: Number(row.doctors ?? 0),
      });
    }
    const registrationsChart = last30Days.map((date) => ({
      date,
      ...(regMap.get(date) ?? { patients: 0, doctors: 0 }),
    }));

    // Build revenue chart with zero-fill
    const revMap = new Map<string, number>();
    for (const row of Array.from(revenueRaw) as Array<{ date: unknown; amount: unknown }>) {
      const dateStr = row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10);
      revMap.set(dateStr, Number(row.amount ?? 0));
    }
    const revenueChart = last30Days.map((date) => ({
      date,
      amount: revMap.get(date) ?? 0,
    }));

    const data: DashboardData = {
      usersTotal,
      usersActiveToday,
      usersGrowthPercent,
      doctorsTotal,
      doctorsPending,
      subscriptionsActive,
      mrr,
      revenueMonth,
      registrationsChart,
      revenueChart,
      recentRegistrations: recentRegistrationsResult.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: u.plan,
        createdAt: u.createdAt.toISOString(),
      })),
      pendingDoctors: pendingDoctorsResult.map((d) => ({
        id: d.id,
        userId: d.userId,
        name: d.name ?? null,
        specialization: d.specialization ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
      recentPayments: recentPaymentsResult.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: p.userName ?? null,
        amount: p.amount,
        type: p.type,
        provider: p.provider ?? null,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    };

    await redis.set('admin:dashboard', JSON.stringify(data), 'EX', 300);

    return c.json(data);
  } catch (err) {
    console.error('Dashboard error:', err);
    return c.json({ error: 'Dashboard data unavailable' }, 500);
  }
});

export { router as adminDashboardRouter };
