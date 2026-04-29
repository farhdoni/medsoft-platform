import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';

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

export const requireAivitaAuth = createMiddleware(async (c, next) => {
  const sessionCookie = getCookie(c, 'aivita_session')
    ?? c.req.header('X-Aivita-Session');

  if (!sessionCookie) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
    const session = JSON.parse(decoded) as AivitaSession;
    if (!session.userId) return c.json({ error: 'Invalid session' }, 401);

    c.set('aivitaUserId', session.userId);
    c.set('aivitaSession', session);
    await next();
  } catch {
    return c.json({ error: 'Invalid session' }, 401);
  }
});
