import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';

export type AivitaSession = {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
};

declare module 'hono' {
  interface ContextVariableMap {
    aivitaUserId: string;
    aivitaSession: AivitaSession;
  }
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is required');
  return new TextEncoder().encode(secret);
}

export const requireAivitaAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'aivita_session')
    ?? c.req.header('X-Aivita-Session');

  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as unknown as AivitaSession;
    if (!session.userId) return c.json({ error: 'Invalid session' }, 401);

    c.set('aivitaUserId', session.userId);
    c.set('aivitaSession', session);
    await next();
  } catch {
    return c.json({ error: 'Invalid session' }, 401);
  }
});
