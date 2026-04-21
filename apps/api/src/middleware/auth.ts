import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../services/tokens';
import { db } from '@medsoft/db';
import { adminUsers } from '@medsoft/db';
import { eq } from 'drizzle-orm';

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, 'access_token');
  if (!token) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);

  try {
    const payload = await verifyToken(token);
    if (payload.type !== 'access') throw new Error('Wrong token type');

    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, payload.sub!)).limit(1);
    if (!admin || !admin.isActive) throw new Error('Admin not found or inactive');

    c.set('admin' as never, admin);
    await next();
  } catch {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
  }
};

export const requireRole = (...roles: string[]): MiddlewareHandler => async (c, next) => {
  const admin = c.get('admin' as never) as { role: string } | undefined;
  if (!admin || !roles.includes(admin.role)) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
  }
  await next();
};
