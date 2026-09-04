import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../lib/jwt.js';
import { db } from '@medsoft/db';
import { adminUsers, adminSessions } from '@medsoft/db';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { hasRight } from '../lib/rbac.js';

type AdminPayload = {
  sub: string;
  role: string;
  sessionId: string;
};

declare module 'hono' {
  interface ContextVariableMap {
    adminId: string;
    adminRole: string;
    sessionId: string;
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'access_token') ?? c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token) as unknown as AdminPayload;
    const session = await db.query.adminSessions.findFirst({
      where: and(
        eq(adminSessions.id, payload.sessionId),
        gt(adminSessions.expiresAt, new Date()),
        isNull(adminSessions.revokedAt),
      ),
    });
    if (!session) return c.json({ error: 'Session expired' }, 401);

    c.set('adminId', payload.sub);
    c.set('adminRole', payload.role);
    c.set('sessionId', payload.sessionId);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

export const requireSuperadmin = createMiddleware(async (c, next) => {
  if (c.get('adminRole') !== 'superadmin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

/**
 * «Оператор или выше» — ступень между requireAuth и requireSuperadmin.
 * Единственный потребитель — aivita-admin-support.ts.
 *
 * Было: строковая роль из JWT сверялась с хардкод-массивом OPERATOR_ROLES
 * (['superadmin','admin','moderator','support']) — третий, отдельный от
 * schema-enum и от admin_roles.name словарь ролей (docs/rbac-model.md §1.2).
 * Заменено на право `aivita:support` из общего каталога (lib/rbac.ts) —
 * тот же результат сегодня (единственный живой путь, кроме superadmin, всё
 * равно шёл через 0 строк в admin_user_roles и никогда не срабатывал), но
 * без отдельного списка ролей, который надо было держать в уме синхронно
 * с restrictions.
 */
export const requireOperator = createMiddleware(async (c, next) => {
  if (await hasRight(c.get('adminId'), c.get('adminRole'), 'aivita:support')) {
    await next();
    return;
  }
  return c.json({ error: 'Forbidden' }, 403);
});
