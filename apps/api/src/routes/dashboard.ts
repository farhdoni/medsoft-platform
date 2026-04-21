import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { patients, doctors, sosCalls, transactions, auditLogs, adminUsers } from '@medsoft/db';
import { eq, isNull, and, sql, gte, inArray } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

export const dashboardRouter = new Hono();
dashboardRouter.use('*', requireAuth);

dashboardRouter.get('/stats', async (c) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const dayAgo = new Date(Date.now() - 86400000);

  const [
    [{ patientsTotal }],
    [{ patientsWeek }],
    [{ doctorsActive }],
    [{ sosOpen }],
    [{ sos24h }],
    [{ revenueMonth }],
  ] = await Promise.all([
    db.select({ patientsTotal: sql<number>`count(*)::int` }).from(patients).where(isNull(patients.deletedAt)),
    db.select({ patientsWeek: sql<number>`count(*)::int` }).from(patients).where(and(isNull(patients.deletedAt), gte(patients.createdAt, weekAgo))),
    db.select({ doctorsActive: sql<number>`count(*)::int` }).from(doctors).where(and(isNull(doctors.deletedAt), eq(doctors.status, 'active'))),
    db.select({ sosOpen: sql<number>`count(*)::int` }).from(sosCalls).where(and(isNull(sosCalls.deletedAt), inArray(sosCalls.status, ['triggered', 'operator_assigned', 'brigade_dispatched', 'in_progress']))),
    db.select({ sos24h: sql<number>`count(*)::int` }).from(sosCalls).where(and(isNull(sosCalls.deletedAt), gte(sosCalls.createdAt, dayAgo))),
    db.select({ revenueMonth: sql<string>`coalesce(sum(amount_uzs)::text,'0')` }).from(transactions).where(and(isNull(transactions.deletedAt), eq(transactions.status, 'completed'), eq(transactions.direction, 'in'), gte(transactions.createdAt, monthAgo))),
  ]);

  return c.json({ patientsTotal, patientsWeek, doctorsActive, sosOpen, sos24h, revenueMonth });
});

dashboardRouter.get('/activity', async (c) => {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
      adminEmail: adminUsers.email,
      adminName: adminUsers.fullName,
    })
    .from(auditLogs)
    .leftJoin(adminUsers, eq(auditLogs.actorAdminId, adminUsers.id))
    .orderBy(sql`${auditLogs.createdAt} DESC`)
    .limit(20);
  return c.json(rows);
});
