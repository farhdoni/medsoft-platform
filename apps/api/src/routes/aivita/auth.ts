import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  aivitaEmailVerifications,
  aivitaPasswordResets,
} from '@medsoft/db';
import { eq, or, and, isNull, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomInt, createHash, randomBytes } from 'crypto';
import { SignJWT } from 'jose';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { sendVerificationCode, sendPasswordReset } from '../../lib/email.js';
import { env } from '../../env.js';

function getSessionSecret(): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

async function signMobileToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSessionSecret());
}

export const aivitaAuthRouter = new Hono();

// ─── Helper: build session payload returned to Next.js for cookie creation ────

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
};

// ─── Register ─────────────────────────────────────────────────────────────────

aivitaAuthRouter.post(
  '/register',
  zValidator('json', z.object({
    email: z.string().email(),
    nickname: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i),
    password: z.string().min(8),
    name: z.string().min(1).max(100).optional(),
    locale: z.string().default('ru'),
  })),
  async (c) => {
    const { email, nickname, password, name, locale } = c.req.valid('json');

    // Check uniqueness
    const existing = await db.query.aivitaUsers.findFirst({
      where: or(
        eq(aivitaUsers.email, email.toLowerCase()),
        eq(aivitaUsers.nickname, nickname.toLowerCase())
      ),
    });

    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'nickname';
      return c.json({ error: `${field}_taken` }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = String(randomInt(100000, 999999));

    const [user] = await db.insert(aivitaUsers).values({
      email: email.toLowerCase(),
      nickname: nickname.toLowerCase(),
      name: name ?? nickname,
      passwordHash,
      provider: 'email',
      locale,
    }).returning();

    // Create verification code (15 min TTL)
    await db.insert(aivitaEmailVerifications).values({
      userId: user.id,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await sendVerificationCode(user.email!, code);

    return c.json({ data: { userId: user.id, email: user.email } }, 201);
  }
);

// ─── Verify email ─────────────────────────────────────────────────────────────

aivitaAuthRouter.post(
  '/verify-email',
  zValidator('json', z.object({
    userId: z.string().uuid(),
    code: z.string().length(6),
  })),
  async (c) => {
    const { userId, code } = c.req.valid('json');
    const now = new Date();

    const verification = await db.query.aivitaEmailVerifications.findFirst({
      where: and(
        eq(aivitaEmailVerifications.userId, userId),
        eq(aivitaEmailVerifications.code, code),
        isNull(aivitaEmailVerifications.usedAt),
        gt(aivitaEmailVerifications.expiresAt, now)
      ),
    });

    if (!verification) {
      return c.json({ error: 'invalid_code' }, 400);
    }

    // Mark code used + verify email
    await Promise.all([
      db.update(aivitaEmailVerifications)
        .set({ usedAt: now })
        .where(eq(aivitaEmailVerifications.id, verification.id)),
      db.update(aivitaUsers)
        .set({ emailVerified: now, updatedAt: now })
        .where(eq(aivitaUsers.id, userId)),
    ]);

    const user = await db.query.aivitaUsers.findFirst({
      where: eq(aivitaUsers.id, userId),
    });

    if (!user) return c.json({ error: 'user_not_found' }, 404);

    const session: SessionPayload = {
      userId: user.id,
      email: user.email!,
      name: user.name ?? user.nickname ?? '',
      avatarUrl: user.avatarUrl ?? undefined,
      onboardingCompleted: user.onboardingCompleted,
    };

    // Return session data — Next.js will create the JWT cookie
    return c.json({ data: { session } });
  }
);

// ─── Resend verification code ─────────────────────────────────────────────────

aivitaAuthRouter.post(
  '/resend-code',
  zValidator('json', z.object({ userId: z.string().uuid() })),
  async (c) => {
    const { userId } = c.req.valid('json');

    const user = await db.query.aivitaUsers.findFirst({
      where: and(eq(aivitaUsers.id, userId), isNull(aivitaUsers.emailVerified)),
    });

    if (!user) return c.json({ error: 'not_found' }, 404);

    const code = String(randomInt(100000, 999999));

    await db.insert(aivitaEmailVerifications).values({
      userId: user.id,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await sendVerificationCode(user.email!, code);

    return c.json({ data: { sent: true } });
  }
);

// ─── Login ────────────────────────────────────────────────────────────────────

aivitaAuthRouter.post(
  '/login',
  zValidator('json', z.object({
    identifier: z.string(), // email or nickname
    password: z.string(),
  })),
  async (c) => {
    const { identifier, password } = c.req.valid('json');
    const isEmail = identifier.includes('@');

    const user = await db.query.aivitaUsers.findFirst({
      where: isEmail
        ? eq(aivitaUsers.email, identifier.toLowerCase())
        : eq(aivitaUsers.nickname, identifier.toLowerCase()),
    });

    // Generic error — don't reveal whether user exists
    const invalidErr = c.json({ error: 'invalid_credentials' }, 401);

    if (!user || !user.passwordHash || user.deletedAt) return invalidErr;

    // Check lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return c.json({ error: 'account_locked', retryAfter }, 429);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockedUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      await db.update(aivitaUsers)
        .set({ failedLoginAttempts: attempts, lockedUntil, updatedAt: new Date() })
        .where(eq(aivitaUsers.id, user.id));

      return invalidErr;
    }

    // Email must be verified
    if (!user.emailVerified) {
      return c.json({ error: 'email_not_verified', userId: user.id }, 403);
    }

    // Reset failed attempts + update last login
    await db.update(aivitaUsers)
      .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(aivitaUsers.id, user.id));

    const session: SessionPayload = {
      userId: user.id,
      email: user.email!,
      name: user.name ?? user.nickname ?? '',
      avatarUrl: user.avatarUrl ?? undefined,
      onboardingCompleted: user.onboardingCompleted,
    };

    // Return session data — Next.js will create the JWT cookie
    return c.json({ data: { session } });
  }
);

// ─── Forgot password ──────────────────────────────────────────────────────────

aivitaAuthRouter.post(
  '/forgot-password',
  zValidator('json', z.object({ email: z.string().email() })),
  async (c) => {
    const { email } = c.req.valid('json');

    // Always respond 200 to avoid user enumeration
    const user = await db.query.aivitaUsers.findFirst({
      where: eq(aivitaUsers.email, email.toLowerCase()),
    });

    if (user && user.emailVerified && !user.deletedAt) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      await db.insert(aivitaPasswordResets).values({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      await sendPasswordReset(email, rawToken);
    }

    return c.json({ data: { sent: true } });
  }
);

// ─── Reset password ───────────────────────────────────────────────────────────

aivitaAuthRouter.post(
  '/reset-password',
  zValidator('json', z.object({
    token: z.string(),
    password: z.string().min(8),
  })),
  async (c) => {
    const { token, password } = c.req.valid('json');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const reset = await db.query.aivitaPasswordResets.findFirst({
      where: and(
        eq(aivitaPasswordResets.tokenHash, tokenHash),
        isNull(aivitaPasswordResets.usedAt),
        gt(aivitaPasswordResets.expiresAt, now)
      ),
    });

    if (!reset) return c.json({ error: 'invalid_token' }, 400);

    const passwordHash = await bcrypt.hash(password, 12);

    await Promise.all([
      db.update(aivitaPasswordResets)
        .set({ usedAt: now })
        .where(eq(aivitaPasswordResets.id, reset.id)),
      db.update(aivitaUsers)
        .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null, updatedAt: now })
        .where(eq(aivitaUsers.id, reset.userId)),
    ]);

    return c.json({ data: { success: true } });
  }
);

// ─── Get current user ──────────────────────────────────────────────────────────

aivitaAuthRouter.get('/me', requireAivitaAuth, async (c) => {
  const session = c.get('aivitaSession');
  const user = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.id, session.userId),
  });
  if (!user || user.deletedAt) return c.json({ error: 'user_not_found' }, 404);
  return c.json({ data: user });
});

// ─── Mobile token (returns signed JWT for React Native app) ───────────────────

aivitaAuthRouter.post(
  '/mobile-token',
  zValidator('json', z.object({
    identifier: z.string(),
    password: z.string(),
  })),
  async (c) => {
    const { identifier, password } = c.req.valid('json');
    const isEmail = identifier.includes('@');

    const user = await db.query.aivitaUsers.findFirst({
      where: isEmail
        ? eq(aivitaUsers.email, identifier.toLowerCase())
        : eq(aivitaUsers.nickname, identifier.toLowerCase()),
    });

    const invalidErr = () => c.json({ error: 'invalid_credentials' }, 401);

    if (!user || !user.passwordHash || user.deletedAt) return invalidErr();

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return c.json({ error: 'account_locked', retryAfter }, 429);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await db.update(aivitaUsers)
        .set({ failedLoginAttempts: attempts, lockedUntil, updatedAt: new Date() })
        .where(eq(aivitaUsers.id, user.id));
      return invalidErr();
    }

    if (!user.emailVerified) {
      return c.json({ error: 'email_not_verified', userId: user.id }, 403);
    }

    await db.update(aivitaUsers)
      .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(aivitaUsers.id, user.id));

    const session: SessionPayload = {
      userId: user.id,
      email: user.email!,
      name: user.name ?? user.nickname ?? '',
      avatarUrl: user.avatarUrl ?? undefined,
      onboardingCompleted: user.onboardingCompleted,
    };

    const token = await signMobileToken(session);

    return c.json({
      data: {
        token,
        user: { id: user.id, email: user.email, name: session.name, onboardingCompleted: user.onboardingCompleted },
      },
    });
  }
);

// ─── Sign out ──────────────────────────────────────────────────────────────────

aivitaAuthRouter.post('/sign-out', requireAivitaAuth, (c) => {
  deleteCookie(c, 'aivita_session', { path: '/' });
  return c.json({ data: { success: true } });
});

// ─── Complete onboarding ───────────────────────────────────────────────────────

aivitaAuthRouter.post('/complete-onboarding', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');

  await db.update(aivitaUsers)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(aivitaUsers.id, userId));

  const prev = c.get('aivitaSession');
  const session: SessionPayload = { ...prev, onboardingCompleted: true };

  // Return updated session — Next.js refreshes the cookie
  return c.json({ data: { session } });
});
