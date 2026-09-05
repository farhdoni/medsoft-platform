import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { requireRight } from '../../lib/rbac.js';
import { describeUserAgent } from '../../lib/user-agent.js';
import { db } from '@medsoft/db';
import { authLogs, blockedIps, adminSessions, adminUsers } from '@medsoft/db';
import { eq, desc, gte, lte, and, or, gt, isNull, count } from 'drizzle-orm';

// docs/rbac-model.md enforcement (feat/rbac-enforce-2): this file carries
// two rights, so requireRight goes per-route (requireAuth stays
// router-wide) — security:read on the read routes (auth-logs, and reading
// the current blocked-ips list), security:manage on the routes that
// mutate blocked IPs.
export const adminSecurityRouter = new Hono();
adminSecurityRouter.use('*', requireAuth);

// ─── GET /auth-logs ───────────────────────────────────────────────────────────

adminSecurityRouter.get('/auth-logs', requireRight('security:read'), async (c) => {
  const { status, email, ip, dateFrom, dateTo, page = '1', limit = '50' } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (status) conditions.push(eq(authLogs.status, status));
  if (email) conditions.push(eq(authLogs.email, email));
  if (ip) conditions.push(eq(authLogs.ip, ip));
  if (dateFrom) conditions.push(gte(authLogs.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(authLogs.createdAt, new Date(dateTo)));

  const [rows, total] = await Promise.all([
    db.select().from(authLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(authLogs.createdAt))
      .limit(parseInt(limit))
      .offset(offset),
    db.select({ cnt: count() }).from(authLogs)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  return c.json({ data: rows, total: Number(total[0]?.cnt ?? 0) });
});

// ─── GET /blocked-ips ─────────────────────────────────────────────────────────

adminSecurityRouter.get('/blocked-ips', requireRight('security:read'), async (c) => {
  const now = new Date();
  const rows = await db.select()
    .from(blockedIps)
    .where(
      or(isNull(blockedIps.expiresAt), gt(blockedIps.expiresAt, now))
    )
    .orderBy(desc(blockedIps.blockedAt));
  return c.json({ data: rows });
});

// ─── POST /blocked-ips ────────────────────────────────────────────────────────

adminSecurityRouter.post('/blocked-ips', requireRight('security:manage'), async (c) => {
  const body = await c.req.json() as {
    ip: string;
    reason?: string;
    expiresAt?: string;
  };
  const [row] = await db.insert(blockedIps)
    .values({
      ip: body.ip,
      reason: body.reason ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .onConflictDoUpdate({
      target: blockedIps.ip,
      set: {
        reason: body.reason ?? null,
        blockedAt: new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })
    .returning();
  return c.json({ data: row }, 201);
});

// ─── DELETE /blocked-ips/:id ──────────────────────────────────────────────────

adminSecurityRouter.delete('/blocked-ips/:id', requireRight('security:manage'), async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(blockedIps).where(eq(blockedIps.id, id));
  return c.json({ ok: true });
});

// ─── GET /sessions ──────────────────────────────────────────────────────────────

adminSecurityRouter.get('/sessions', requireRight('security:read'), async (c) => {
  const rows = await db.select({
    id: adminSessions.id,
    userAgent: adminSessions.userAgent,
    ipAddress: adminSessions.ipAddress,
    createdAt: adminSessions.createdAt,
    email: adminUsers.email,
    fullName: adminUsers.fullName,
    role: adminUsers.role,
  })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
    .where(and(
      gt(adminSessions.expiresAt, new Date()),
      isNull(adminSessions.revokedAt),
    ))
    .orderBy(desc(adminSessions.createdAt));

  return c.json({
    data: rows.map((s) => ({
      id: s.id,
      email: s.email,
      fullName: s.fullName,
      role: s.role,
      device: describeUserAgent(s.userAgent),
      ip: s.ipAddress,
      createdAt: s.createdAt,
    })),
  });
});

// ─── DELETE /sessions/:id ───────────────────────────────────────────────────────

adminSecurityRouter.delete('/sessions/:id', requireRight('security:manage'), async (c) => {
  const id = c.req.param('id');
  await db.update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(adminSessions.id, id));
  return c.json({ ok: true });
});
