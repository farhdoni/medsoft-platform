import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../lib/jwt.js';
import { db } from '@medsoft/db';
import { adminUsers, adminSessions, adminRoles, adminUserRoles } from '@medsoft/db';
import { eq, and, gt, isNull } from 'drizzle-orm';

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

/** Роли, которым открыт кабинет поддержки. */
const OPERATOR_ROLES = ['superadmin', 'admin', 'moderator', 'support'];

/**
 * «Оператор или выше» — ступень между requireAuth и requireSuperadmin.
 *
 * Проверок две, и обе нужны. Сначала строковая роль из JWT: сегодня все
 * существующие админы ходят по admin_users.role, а admin_user_roles пуста —
 * guard, читающий только её, закрыл бы кабинет всем. Затем ролевые таблицы из
 * 0010: они позволяют завести оператора, не выдавая ему superadmin, и именно
 * они целевой источник истины.
 *
 * Цена — один индексированный запрос, и только для тех, кому не хватило роли
 * из токена. Обратная сторона быстрого пути: роль в JWT зафиксирована на
 * момент логина, поэтому отзыв прав по нему сработает после перелогина.
 */
export const requireOperator = createMiddleware(async (c, next) => {
  if (OPERATOR_ROLES.includes(c.get('adminRole'))) {
    await next();
    return;
  }

  const granted = await db
    .select({ name: adminRoles.name })
    .from(adminUserRoles)
    .innerJoin(adminRoles, eq(adminRoles.id, adminUserRoles.roleId))
    .where(eq(adminUserRoles.userId, c.get('adminId')));

  if (granted.some((r) => OPERATOR_ROLES.includes(r.name))) {
    await next();
    return;
  }

  return c.json({ error: 'Forbidden' }, 403);
});
