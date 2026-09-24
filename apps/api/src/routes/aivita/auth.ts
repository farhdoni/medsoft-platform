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
import { eq, and, isNull, gt, desc } from 'drizzle-orm';
import { grantReferralReward } from './referral.js';
import bcrypt from 'bcryptjs';
import { randomInt, createHash, randomBytes } from 'crypto';
import { SignJWT } from 'jose';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { sendVerificationCode, sendPasswordReset } from '../../lib/email.js';
import { sendAuthMessage } from '../../lib/notify-code.js';
import { resolveBotLocale, verificationCodeMessage, passwordResetMessage } from '../../lib/telegram-i18n.js';
import { safeTimezone, isValidTimezone, DEFAULT_TIMEZONE } from '../../lib/timezone.js';
import { env } from '../../env.js';
import { appUrl } from '../../lib/app-url.js';
import { logger } from '../../lib/logger.js';
import { decideRegistration, decideResend, RESEND_ATTEMPT_WINDOW_MS } from '../../lib/registration-guard.js';
import { checkVerifyLock, nextVerifyLockState } from '../../lib/verify-guard.js';

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
    const normalizedEmail = email.toLowerCase();

    const existingByEmail = await db.query.aivitaUsers.findFirst({
      where: eq(aivitaUsers.email, normalizedEmail),
    });
    const existingByNickname = existingByEmail ? null : await db.query.aivitaUsers.findFirst({
      where: eq(aivitaUsers.nickname, nickname.toLowerCase()),
    });

    const recentCodes = existingByEmail
      ? await db.select({ createdAt: aivitaEmailVerifications.createdAt })
          .from(aivitaEmailVerifications)
          .where(and(
            eq(aivitaEmailVerifications.userId, existingByEmail.id),
            gt(aivitaEmailVerifications.createdAt, new Date(Date.now() - RESEND_ATTEMPT_WINDOW_MS)),
          ))
          .orderBy(desc(aivitaEmailVerifications.createdAt))
      : [];

    const decision = decideRegistration(
      existingByEmail ? { id: existingByEmail.id, emailVerified: existingByEmail.emailVerified } : null,
      existingByNickname?.id ?? null,
      recentCodes.map((r) => r.createdAt),
      new Date(),
    );

    // B3: three distinct outcomes for "this email already exists" instead
    // of one blanket "занято" — verified means "go sign in"; unverified
    // means "we're resending your code, not blocking you". `nickname` is
    // a real, separate conflict (a different account already has it).
    if (decision.action === 'already_verified') {
      return c.json({ error: 'email_taken' }, 409);
    }
    if (decision.action === 'nickname_taken') {
      return c.json({ error: 'nickname_taken' }, 409);
    }
    if (decision.action === 'too_many_attempts') {
      return c.json({ error: 'too_many_attempts' }, 429);
    }
    if (decision.action === 'resend_cooldown') {
      return c.json({ error: 'resend_cooldown', retryAfterSeconds: decision.retryAfterSeconds }, 429);
    }
    if (decision.action === 'resend') {
      // B2: this is the orphaned-account recovery path — same unverified
      // row as a previous failed attempt, just a fresh code + another
      // delivery attempt. Not a second aivita_users row.
      const code = String(randomInt(100000, 999999));
      await db.insert(aivitaEmailVerifications).values({
        userId: decision.userId,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      try {
        const botLocale = resolveBotLocale(undefined, existingByEmail!.locale);
        await sendAuthMessage(
          decision.userId,
          verificationCodeMessage(botLocale, code),
          () => sendVerificationCode(existingByEmail!.email!, code, botLocale),
        );
      } catch (err) {
        logger.error({ err, userId: decision.userId }, '[auth/register] resend to unverified account failed');
        return c.json({ error: 'delivery_failed' }, 502);
      }
      return c.json({ data: { userId: decision.userId, email: existingByEmail!.email } }, 201);
    }

    // decision.action === 'create' from here on.

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

    // B1: user + (optional) doctor profile + (optional) referral + the
    // verification-code row are one atomic transaction — either all of
    // them land or none do. The email send below is deliberately OUTSIDE
    // it: it's a third-party HTTP call, which can't be rolled back and
    // shouldn't hold a DB transaction open for its round-trip. Its own
    // failure mode is handled by the try/catch + compensating delete right
    // after — that's what actually fixes the "orphaned unverified account"
    // bug (Resend rejects the domain, network blip, etc. → the row this
    // transaction just committed is removed again, cascading to the
    // profile/referral/verification rows via ON DELETE CASCADE, freeing
    // the email/nickname immediately instead of leaving them stuck).
    const user = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(aivitaUsers).values({
        email: normalizedEmail,
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
        let experienceStartDate: string | null = null;
        if (experienceYears != null && experienceYears > 0) {
          const startYear = new Date().getFullYear() - experienceYears;
          experienceStartDate = `${startYear}-01-01`;
        }
        await tx.insert(doctorProfiles).values({
          userId: inserted.id,
          specialization: specialization ?? null,
          phone: phone ?? null,
          experienceStartDate: experienceStartDate ?? null,
          clinicName: workplace ?? null,
          verificationStatus: 'not_verified',
        });
      }

      if (referrerId) {
        await tx.insert(referrals).values({
          referrerId,
          referredId: inserted.id,
          code: refCode!.toUpperCase(),
          status: 'pending',
          rewardGiven: false,
        }).onConflictDoNothing();
      }

      await tx.insert(aivitaEmailVerifications).values({
        userId: inserted.id,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      return inserted;
    });

    try {
      // A just-created user has no notification_settings row yet, so this
      // always resolves to email here — no special-casing needed.
      const botLocale = resolveBotLocale(undefined, user.locale);
      await sendAuthMessage(
        user.id,
        verificationCodeMessage(botLocale, verificationCode),
        () => sendVerificationCode(user.email!, verificationCode, botLocale),
      );
    } catch (err) {
      logger.error({ err, userId: user.id }, '[auth/register] verification message failed — removing the just-created account');
      await db.delete(aivitaUsers).where(eq(aivitaUsers.id, user.id));
      return c.json({ error: 'delivery_failed' }, 502);
    }

    return c.json({ data: { userId: user.id, email: user.email } }, 201);
  }
);

// ─── Passwordless quick sign-up (Part B) ──────────────────────────────────────
//
// email -> code -> in. No password at this step (aivita_users.passwordHash
// stays null — nothing else in the schema required a migration for this;
// a user can set a password later from Settings). Verification itself
// reuses POST /verify-email as-is: it already doesn't care how the account
// was created, it just checks the code and returns a session.
//
// Three outcomes for an email that already exists, same B3 framing as
// /register: verified -> clear "sign in instead" error, not a dead end;
// unverified -> resend to the SAME row (decideRegistration's normal resend
// path handles both an abandoned password signup and a repeated quick-
// signup attempt identically); rate-limited -> decideResend's shared cap.

aivitaAuthRouter.post(
  '/passwordless/start',
  zValidator('json', z.object({
    email: z.string().email(),
    locale: z.string().default('ru'),
    timezone: z.string().refine(isValidTimezone, { message: 'Invalid IANA timezone' }).optional(),
  })),
  async (c) => {
    const { email, locale, timezone } = c.req.valid('json');
    const normalizedEmail = email.toLowerCase();

    const existingByEmail = await db.query.aivitaUsers.findFirst({
      where: eq(aivitaUsers.email, normalizedEmail),
    });

    const recentCodes = existingByEmail
      ? await db.select({ createdAt: aivitaEmailVerifications.createdAt })
          .from(aivitaEmailVerifications)
          .where(and(
            eq(aivitaEmailVerifications.userId, existingByEmail.id),
            gt(aivitaEmailVerifications.createdAt, new Date(Date.now() - RESEND_ATTEMPT_WINDOW_MS)),
          ))
          .orderBy(desc(aivitaEmailVerifications.createdAt))
      : [];

    const decision = decideRegistration(
      existingByEmail ? { id: existingByEmail.id, emailVerified: existingByEmail.emailVerified } : null,
      null, // no nickname submitted at this step — nothing to conflict on
      recentCodes.map((r) => r.createdAt),
      new Date(),
    );

    if (decision.action === 'already_verified') {
      return c.json({ error: 'email_taken' }, 409);
    }
    if (decision.action === 'too_many_attempts') {
      return c.json({ error: 'too_many_attempts' }, 429);
    }
    if (decision.action === 'resend_cooldown') {
      return c.json({ error: 'resend_cooldown', retryAfterSeconds: decision.retryAfterSeconds }, 429);
    }
    if (decision.action === 'resend') {
      const code = String(randomInt(100000, 999999));
      await db.insert(aivitaEmailVerifications).values({
        userId: decision.userId,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      try {
        const botLocale = resolveBotLocale(undefined, existingByEmail!.locale);
        await sendAuthMessage(
          decision.userId,
          verificationCodeMessage(botLocale, code),
          () => sendVerificationCode(existingByEmail!.email!, code, botLocale),
        );
      } catch (err) {
        logger.error({ err, userId: decision.userId }, '[auth/passwordless/start] resend to unverified account failed');
        return c.json({ error: 'delivery_failed' }, 502);
      }
      return c.json({ data: { userId: decision.userId, email: existingByEmail!.email } }, 201);
    }

    // decision.action === 'create' from here on — brand-new account, no
    // password, no nickname (both columns are nullable; a null nickname is
    // already handled safely everywhere it's read — name/nickname/email
    // fallback chains, or a truthy guard before display).
    const verificationCode = String(randomInt(100000, 999999));
    const referralCode = `AIVI${String(randomInt(1000, 9999))}`;

    const user = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(aivitaUsers).values({
        email: normalizedEmail,
        provider: 'email_code',
        locale,
        timezone: safeTimezone(timezone ?? DEFAULT_TIMEZONE),
        role: 'patient',
        plan: 'free',
        referralCode,
      }).returning();

      await tx.insert(aivitaEmailVerifications).values({
        userId: inserted.id,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      return inserted;
    });

    try {
      const botLocale = resolveBotLocale(undefined, user.locale);
      await sendAuthMessage(
        user.id,
        verificationCodeMessage(botLocale, verificationCode),
        () => sendVerificationCode(user.email!, verificationCode, botLocale),
      );
    } catch (err) {
      logger.error({ err, userId: user.id }, '[auth/passwordless/start] verification message failed — removing the just-created account');
      await db.delete(aivitaUsers).where(eq(aivitaUsers.id, user.id));
      return c.json({ error: 'delivery_failed' }, 502);
    }

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

    const existingUser = await db.query.aivitaUsers.findFirst({
      where: eq(aivitaUsers.id, userId),
    });
    if (!existingUser) return c.json({ error: 'user_not_found' }, 404);

    const lock = checkVerifyLock(existingUser.emailVerifyLockedUntil, now);
    if (lock.locked) {
      return c.json({ error: 'too_many_attempts', retryAfterSeconds: lock.retryAfterSeconds }, 429);
    }

    const verification = await db.query.aivitaEmailVerifications.findFirst({
      where: and(
        eq(aivitaEmailVerifications.userId, userId),
        eq(aivitaEmailVerifications.code, code),
        isNull(aivitaEmailVerifications.usedAt),
        gt(aivitaEmailVerifications.expiresAt, now)
      ),
    });

    if (!verification) {
      const next = nextVerifyLockState(existingUser.emailVerifyFailedAttempts, now);
      await db.update(aivitaUsers)
        .set({ emailVerifyFailedAttempts: next.attempts, emailVerifyLockedUntil: next.lockedUntil })
        .where(eq(aivitaUsers.id, userId));
      if (next.lockedUntil) {
        const retryAfterSeconds = Math.ceil((next.lockedUntil.getTime() - now.getTime()) / 1000);
        return c.json({ error: 'too_many_attempts', retryAfterSeconds }, 429);
      }
      return c.json({ error: 'invalid_code' }, 400);
    }

    // Mark code used + verify email + reset the wrong-attempt counter
    await Promise.all([
      db.update(aivitaEmailVerifications)
        .set({ usedAt: now })
        .where(eq(aivitaEmailVerifications.id, verification.id)),
      db.update(aivitaUsers)
        .set({ emailVerified: now, updatedAt: now, emailVerifyFailedAttempts: 0, emailVerifyLockedUntil: null })
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

    // B4: this endpoint used to have no server-side throttling at all — the
    // 60s cooldown on the resend button was purely client-side JS, trivially
    // bypassed by calling the endpoint directly. Same decideResend() cooldown
    // + hard cap as /register's own resend branch, keyed the same way (this
    // user's recent aivitaEmailVerifications rows).
    const recentCodes = await db.select({ createdAt: aivitaEmailVerifications.createdAt })
      .from(aivitaEmailVerifications)
      .where(and(
        eq(aivitaEmailVerifications.userId, user.id),
        gt(aivitaEmailVerifications.createdAt, new Date(Date.now() - RESEND_ATTEMPT_WINDOW_MS)),
      ))
      .orderBy(desc(aivitaEmailVerifications.createdAt));

    const decision = decideResend(recentCodes.map((r) => r.createdAt), new Date());
    if (decision.action === 'too_many_attempts') {
      return c.json({ error: 'too_many_attempts' }, 429);
    }
    if (decision.action === 'resend_cooldown') {
      return c.json({ error: 'resend_cooldown', retryAfterSeconds: decision.retryAfterSeconds }, 429);
    }

    const code = String(randomInt(100000, 999999));

    await db.insert(aivitaEmailVerifications).values({
      userId: user.id,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const botLocale = resolveBotLocale(undefined, user.locale);
    await sendAuthMessage(
      user.id,
      verificationCodeMessage(botLocale, code),
      () => sendVerificationCode(user.email!, code, botLocale),
    );

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

      // Computed once so Telegram and email carry the exact same link —
      // matches sendPasswordReset's own default when no opts.linkUrl is given.
      // Locale-prefixed to the account's own language, same as the message text below.
      const locale = resolveBotLocale(undefined, user.locale);
      const resetUrl = appUrl(`/reset-password?token=${rawToken}`, locale);
      await sendAuthMessage(
        user.id,
        passwordResetMessage(locale, resetUrl),
        () => sendPasswordReset(email, rawToken, { linkUrl: resetUrl }),
      );
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

