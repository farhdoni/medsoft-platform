import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { describeUserAgent } from '../lib/user-agent.js';
import { db } from '@medsoft/db';
import { adminSessions } from '@medsoft/db';
import { eq, and, gt, isNull, desc } from 'drizzle-orm';

// Self-service account data — separate from auth.ts (login/logout/password/
// 2FA lifecycle). requireAuth only, no requireRight: these routes only ever
// read/touch the calling admin's own rows, so there's nothing to gate by
// permission.
export const accountRouter = new Hono();
accountRouter.use('*', requireAuth);

// ─── GET /sessions ─────────────────────────────────────────────────────────────

accountRouter.get('/sessions', async (c) => {
  const adminId = c.get('adminId');
  const currentSessionId = c.get('sessionId');

  const rows = await db.select()
    .from(adminSessions)
    .where(and(
      eq(adminSessions.adminUserId, adminId),
      gt(adminSessions.expiresAt, new Date()),
      isNull(adminSessions.revokedAt),
    ))
    .orderBy(desc(adminSessions.createdAt));

  return c.json({
    data: rows.map((s) => ({
      id: s.id,
      device: describeUserAgent(s.userAgent),
      ip: s.ipAddress,
      createdAt: s.createdAt,
      isCurrent: s.id === currentSessionId,
    })),
  });
});

// ─── DELETE /sessions/:id ───────────────────────────────────────────────────────

accountRouter.delete('/sessions/:id', async (c) => {
  const adminId = c.get('adminId');
  const id = c.req.param('id');

  const [session] = await db.select().from(adminSessions)
    .where(and(eq(adminSessions.id, id), eq(adminSessions.adminUserId, adminId)))
    .limit(1);
  if (!session) return c.json({ error: 'Сессия не найдена' }, 404);

  await db.update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(adminSessions.id, id));

  return c.json({ ok: true });
});
