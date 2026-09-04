import { Hono } from 'hono';
import { db, downloadLogs } from '@medsoft/db';
import { eq, and, gte, count, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

// Split out of clinic-requests.ts (docs/routes-split-plan.md) — was the
// `/stats/downloads` route on `clinicAdminRouter`, right `main:read`, not
// `content:clinic_requests_*`. Mounted at the same two prefixes as before
// (`/v1/admin/content`, `/v1/admin/stats`) to keep every external path
// byte-for-byte identical to pre-split behaviour.

export const downloadStatsRouter = new Hono();
downloadStatsRouter.use('*', requireAuth);

// GET /stats/downloads
downloadStatsRouter.get('/stats/downloads', async (c) => {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [patientTotal, doctorTotal, patientToday, doctorToday] = await Promise.all([
    db.select({ cnt: count() }).from(downloadLogs).where(eq(downloadLogs.app, 'patient')),
    db.select({ cnt: count() }).from(downloadLogs).where(eq(downloadLogs.app, 'doctor')),
    db.select({ cnt: count() }).from(downloadLogs).where(and(eq(downloadLogs.app, 'patient'), gte(downloadLogs.createdAt, startOfToday))),
    db.select({ cnt: count() }).from(downloadLogs).where(and(eq(downloadLogs.app, 'doctor'), gte(downloadLogs.createdAt, startOfToday))),
  ]);

  const chartRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${downloadLogs.createdAt})::date::text`,
      app: downloadLogs.app,
      cnt: count(),
    })
    .from(downloadLogs)
    .where(gte(downloadLogs.createdAt, startOf30Days))
    .groupBy(sql`date_trunc('day', ${downloadLogs.createdAt})::date::text`, downloadLogs.app)
    .orderBy(sql`1`);

  const chartMap: Record<string, { date: string; patient: number; doctor: number }> = {};
  for (const row of chartRows) {
    if (!chartMap[row.date]) chartMap[row.date] = { date: row.date, patient: 0, doctor: 0 };
    chartMap[row.date][row.app as 'patient' | 'doctor'] = Number(row.cnt);
  }

  return c.json({
    patientTotal: Number(patientTotal[0]?.cnt ?? 0),
    doctorTotal: Number(doctorTotal[0]?.cnt ?? 0),
    patientToday: Number(patientToday[0]?.cnt ?? 0),
    doctorToday: Number(doctorToday[0]?.cnt ?? 0),
    chart: Object.values(chartMap),
  });
});
