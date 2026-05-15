import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { db } from '@medsoft/db';
import { pharmacyUsers } from '@medsoft/db';
import { eq, and } from 'drizzle-orm';

declare module 'hono' {
  interface ContextVariableMap {
    pharmacyUserId: string;
    pharmacyId: number;
    pharmacyRole: string;
  }
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is required');
  return new TextEncoder().encode(secret);
}

export const requirePharmacyAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'aivita_api')
    ?? getCookie(c, 'aivita_session')
    ?? c.req.header('X-Aivita-Session');

  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = (payload as { userId?: string }).userId;
    if (!userId) return c.json({ error: 'Invalid session' }, 401);

    const [pu] = await db.select()
      .from(pharmacyUsers)
      .where(eq(pharmacyUsers.userId, userId))
      .limit(1);

    if (!pu) return c.json({ error: 'Not a pharmacy user' }, 403);

    c.set('pharmacyUserId', userId);
    c.set('pharmacyId', pu.pharmacyId);
    c.set('pharmacyRole', pu.role ?? 'operator');
    await next();
  } catch {
    return c.json({ error: 'Invalid session' }, 401);
  }
});
