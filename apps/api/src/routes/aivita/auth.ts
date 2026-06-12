import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  aivitaUsers,
  aivitaEmailVerifications,
  aivitaPasswordResets,
  aivitaSessions,
  doctorProfiles,
  referrals,
} from '@medsoft/db';
import { eq, or, and, isNull, gt } from 'drizzle-orm';
import { grantReferralReward } from './referral.js';
import bcrypt from 'bcryptjs';
import { randomInt, createHash, randomBytes } from 'crypto';
import { SignJWT } from 'jose';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { sendVerificationCode, sendPasswordReset } from '../../lib/email.js';
import { safeTimezone, isValidTimezone, DEFAULT_TIMEZONE } from '../../lib/timezone.js';
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

/** Sign a short-lived API token (1h when SESSIONS_V2, else legacy 30d). */
async function signApiToken(payload: SessionPayload): Promise<string> {
  const ttl = env.SESSIONS_V2 === 'true' ? '1h' : '30d';
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSessionSecret());
}

/** Generate raw refresh token, store SHA-256 hash in DB, return raw token. */
async function createRefreshSession(opts: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<string> {
  const raw = randomBytes(40).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  await db.insert(aivitaSessions).values({
    userId:           opts.userId,
    refreshTokenHash: hash,
    userAgent:        opts.userAgent,
    ipAddress:        opts.ipAddress,
    expiresAt:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return raw;
}

export const aivitaAuthRouter = new Hono();

// ─── Helper: build session payload returned to Next.js for cookie creation ────

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  role?: 'patient' | 'doctor' | 'admin';
  plan?: 'free' | 'plus' | 'pro';
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
    timezone: z.string().refine(isValidTimezone, { message: 'Invalid IANA timezone' }).optional(),
    role: z.enum(['patient', 'doctor']).default('patient'),
    specialization: z.string().max(100).optional(),
    refCode: z.string().max(20).optional(),
    // Doctor-specific fields (ignored for patients)
    phone: z.string().max(30).optional(),
    experienceYears: z.number().int().min(0).max(60).optional(),
    workplace: z.string().max(200).optional(),
  })),
  async (c) => {
    const { email, nickname, password, name, locale, timezone, role, specialization, refCode, phone, experienceYears, workplace } = c.req.valid('json');

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
    const verificationCode = String(randomInt(100000, 999999));

    // Generate unique referral code: first 3-4 chars of name + 4 random digits
    const namePrefix = (name ?? nickname).trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'AIVI';
    const referralCode = `${namePrefix}${String(randomInt(1000, 9999))}`;

    // Resolve referrer if refCode provided
    let referrerId: string | null = null;
    if (refCode) {
      const referrer = await db.select({ id: aivitaUsers.id })
        .from(aivitaUsers).where(eq(aivitaUsers.referralCode, refCode.toUpperCase())).limit(1);
      if (referrer.length) referrerId = referrer[0].id;
    }

    const [user] = await db.insert(aivitaUsers).values({
      email: email.toLowerCase(),
      nickname: nickname.toLowerCase(),
      name: name ?? nickname,
      passwordHash,
      provider: 'email',
      locale,
      timezone: safeTimezone(timezone ?? DEFAULT_TIMEZONE),
      role,
      plan: 'free',
      referralCode,
      referredBy: referrerId ?? undefined,
    }).returning();

    // Если врач — создать профиль с базовыми данными
    if (role === 'doctor') {
      // Compute experienceStartDate from experienceYears
      let experienceStartDate: string | null = null;
      if (experienceYears != null && experienceYears > 0) {
        const startYear = new Date().getFullYear() - experienceYears;
        experienceStartDate = `${startYear}-01-01`;
      }
      await db.insert(doctorProfiles).values({
        userId: user.id,
        specialization: specialization ?? null,
        phone: phone ?? null,
        experienceStartDate: experienceStartDate ?? null,
        clinicName: workplace ?? null,
        verificationStatus: 'not_verified',
      });
    }

    // If referred — create pending referral record
    if (referrerId) {
      await db.insert(referrals).values({
        referrerId,
        referredId: user.id,
        code: refCode!.toUpperCase(),
        status: 'pending',
        rewardGiven: false,
      }).onConflictDoNothing();
    }

    // Create verification code (15 min TTL)
    await db.insert(aivitaEmailVerifications).values({
      userId: user.id,
      code: verificationCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await sendVerificationCode(user.email!, verificationCode);

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

    // Complete pending referral and grant rewards
    if (user.referredBy) {
      const pendingRef = await db.select().from(referrals)
        .where(and(eq(referrals.referredId, userId), eq(referrals.status, 'pending')))
        .limit(1);
      if (pendingRef.length) {
        await db.update(referrals)
          .set({ status: 'completed', rewardGiven: true })
          .where(eq(referrals.id, pendingRef[0].id));
        await grantReferralReward(user.referredBy, userId);
      }
    }

    const session: SessionPayload = {
      userId: user.id,
      email: user.email!,
      name: user.name ?? user.nickname ?? '',
      avatarUrl: user.avatarUrl ?? undefined,
      onboardingCompleted: user.onboardingCompleted,
      role: (user.role as SessionPayload['role']) ?? 'patient',
      plan: (user.plan as SessionPayload['plan']) ?? 'free',
    };

    // Return session data + API token for cookie setup
    const apiToken = await signApiToken(session);
    return c.json({ data: { session, apiToken } });
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

    // In non-production: return the code directly so admins can verify test accounts
    const isDev = env.NODE_ENV !== 'production';
    return c.json({ data: { sent: true, ...(isDev ? { code } : {}) } });
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
      role: (user.role as SessionPayload['role']) ?? 'patient',
      plan: (user.plan as SessionPayload['plan']) ?? 'free',
    };

    // Return session data + API token (+ refresh token when SESSIONS_V2)
    const apiToken = await signApiToken(session);
    let refreshToken: string | undefined;
    if (env.SESSIONS_V2 === 'true') {
      refreshToken = await createRefreshSession({
        userId: user.id,
        userAgent: c.req.header('user-agent'),
        ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip'),
      });
    }
    return c.json({ data: { session, apiToken, refreshToken } });
  }
);

// ─── Refresh session (SESSIONS_V2) ───────────────────────────────────────────

aivitaAuthRouter.post('/refresh', async (c) => {
  if (env.SESSIONS_V2 !== 'true') {
    return c.json({ error: 'not_enabled' }, 404);
  }

  let rawToken: string | undefined;
  try {
    const body = await c.req.json();
    rawToken = body?.refreshToken;
  } catch {
    // body may be empty
  }

  if (!rawToken) return c.json({ error: 'missing_token' }, 400);

  const hash = createHash('sha256').update(rawToken).digest('hex');
  const now = new Date();

  const sessionRow = await db.query.aivitaSessions.findFirst({
    where: eq(aivitaSessions.refreshTokenHash, hash),
  });

  if (!sessionRow) return c.json({ error: 'invalid_token' }, 401);
  if (sessionRow.revokedAt) return c.json({ error: 'token_revoked' }, 401);
  if (sessionRow.expiresAt < now) return c.json({ error: 'token_expired' }, 401);

  const user = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.id, sessionRow.userId),
  });

  if (!user || user.deletedAt) return c.json({ error: 'user_not_found' }, 401);

  const session: SessionPayload = {
    userId: user.id,
    email: user.email!,
    name: user.name ?? user.nickname ?? '',
    avatarUrl: user.avatarUrl ?? undefined,
    onboardingCompleted: user.onboardingCompleted,
    role: (user.role as SessionPayload['role']) ?? 'patient',
    plan: (user.plan as SessionPayload['plan']) ?? 'free',
  };

  // Rotate: revoke old, issue new
  await db.update(aivitaSessions)
    .set({ revokedAt: now })
    .where(eq(aivitaSessions.id, sessionRow.id));

  const [apiToken, newRefreshToken] = await Promise.all([
    signApiToken(session),
    createRefreshSession({
      userId: user.id,
      userAgent: c.req.header('user-agent'),
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip'),
    }),
  ]);

  return c.json({ data: { session, apiToken, refreshToken: newRefreshToken } });
});

// ─── Logout with revoke (SESSIONS_V2) ────────────────────────────────────────

aivitaAuthRouter.post('/logout', async (c) => {
  if (env.SESSIONS_V2 !== 'true') {
    return c.json({ data: { ok: true } });
  }

  let rawToken: string | undefined;
  try {
    const body = await c.req.json();
    rawToken = body?.refreshToken;
  } catch {
    // body may be empty
  }

  if (rawToken) {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    await db.update(aivitaSessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(aivitaSessions.refreshTokenHash, hash),
        isNull(aivitaSessions.revokedAt),
      ));
  }

  return c.json({ data: { ok: true } });
});

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
      role: (user.role as SessionPayload['role']) ?? 'patient',
      plan: (user.plan as SessionPayload['plan']) ?? 'free',
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

  // Return updated session + fresh API token
  const apiToken = await signApiToken(session);
  return c.json({ data: { session, apiToken } });
});

// ─── Internal: force verify email (for test accounts, key-protected) ──────────

const INTERNAL_KEY = 'aivita-internal-verify-2025';

aivitaAuthRouter.post(
  '/internal-verify',
  zValidator('json', z.object({
    userId: z.string().uuid(),
    key: z.string(),
  })),
  async (c) => {
    const { userId, key } = c.req.valid('json');

    if (key !== INTERNAL_KEY) {
      return c.json({ error: 'forbidden' }, 403);
    }

    const now = new Date();
    const [updated] = await db.update(aivitaUsers)
      .set({ emailVerified: now, updatedAt: now })
      .where(eq(aivitaUsers.id, userId))
      .returning({ id: aivitaUsers.id, email: aivitaUsers.email });

    if (!updated) return c.json({ error: 'user_not_found' }, 404);

    return c.json({ data: { verified: true, userId: updated.id, email: updated.email } });
  }
);
