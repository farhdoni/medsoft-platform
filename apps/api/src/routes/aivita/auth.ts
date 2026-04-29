import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { aivitaUsers } from '@medsoft/db';
import { eq, isNull } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaAuthRouter = new Hono();

// ─── Mock sign-in ──────────────────────────────────────────────────────────────
aivitaAuthRouter.post(
  '/mock-sign-in',
  zValidator('json', z.object({
    name: z.string().default('Азиз'),
    email: z.string().email().default('demo@aivita.uz'),
    locale: z.string().default('ru'),
  })),
  async (c) => {
    const { name, email, locale } = c.req.valid('json');

    let user = await db.query.aivitaUsers.findFirst({
      where: eq(aivitaUsers.email, email),
    });

    if (!user) {
      const [created] = await db.insert(aivitaUsers).values({
        email,
        name,
        provider: 'mock',
        locale,
      }).returning();
      user = created;
    } else {
      await db.update(aivitaUsers)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(aivitaUsers.id, user.id));
    }

    const session = {
      userId: user.id,
      email: user.email ?? email,
      name: user.name ?? name,
      avatarUrl: user.avatarUrl ?? undefined,
      onboardingCompleted: user.onboardingCompleted,
    };

    const sessionValue = Buffer.from(JSON.stringify(session)).toString('base64');

    setCookie(c, 'aivita_session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return c.json({ data: session });
  }
);

// ─── Get current session ───────────────────────────────────────────────────────
aivitaAuthRouter.get('/me', requireAivitaAuth, async (c) => {
  const session = c.get('aivitaSession');
  const user = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.id, session.userId),
  });
  if (!user || user.deletedAt) return c.json({ error: 'User not found' }, 404);

  return c.json({ data: user });
});

// ─── Sign out ──────────────────────────────────────────────────────────────────
aivitaAuthRouter.post('/sign-out', requireAivitaAuth, (c) => {
  setCookie(c, 'aivita_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 0,
    path: '/',
  });
  return c.json({ data: { success: true } });
});

// ─── Complete onboarding ───────────────────────────────────────────────────────
aivitaAuthRouter.post('/complete-onboarding', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');

  await db.update(aivitaUsers)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(aivitaUsers.id, userId));

  const session = c.get('aivitaSession');
  const updatedSession = { ...session, onboardingCompleted: true };
  const sessionValue = Buffer.from(JSON.stringify(updatedSession)).toString('base64');

  setCookie(c, 'aivita_session', sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return c.json({ data: { onboardingCompleted: true } });
});
