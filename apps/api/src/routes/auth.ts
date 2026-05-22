import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '@medsoft/db';
import { adminUsers, adminSessions, authLogs, blockedIps } from '@medsoft/db';
import { eq, and, gt, isNull, or } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { env } from '../env.js';
import { loginSchema, changePasswordSchema } from '@medsoft/shared';

async function isIpBlocked(ip: string): Promise<boolean> {
  const now = new Date();
  const rows = await db.select().from(blockedIps)
    .where(
      and(
        eq(blockedIps.ip, ip),
        or(isNull(blockedIps.expiresAt), gt(blockedIps.expiresAt, now)),
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function logAuthAttempt(opts: {
  userId?: string;
  email: string;
  ip: string | null;
  userAgent: string | null;
  status: 'success' | 'failed';
}) {
  await db.insert(authLogs).values({
    userId: opts.userId ?? null,
    email: opts.email,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
    status: opts.status,
  }).catch(() => {}); // non-fatal
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const auth = new Hono();

// POST /v1/auth/login — email + password (+ optional TOTP)
auth.post('/login',
  rateLimit('admin-login', 50, 300),
  zValidator('json', loginSchema.extend({ totpCode: z.string().length(6).optional() })),
  async (c) => {
    const { email, password, totpCode } = c.req.valid('json') as { email: string; password: string; totpCode?: string };
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? null;
    const userAgent = c.req.header('user-agent') ?? null;

    // Check IP block
    if (ip && await isIpBlocked(ip)) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const admin = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, email.toLowerCase().trim()),
    });

    // Do not reveal whether the user exists
    if (!admin) {
      await logAuthAttempt({ email, ip, userAgent, status: 'failed' });
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (!admin.isActive) {
      return c.json({ error: 'Account disabled' }, 403);
    }

    // Check lockout
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const lockedUntilStr = admin.lockedUntil.toISOString();
      return c.json(
        { error: `Too many failed attempts. Try again after ${lockedUntilStr}` },
        429,
      );
    }

    // Verify password
    const passwordOk = admin.passwordHash
      ? await bcrypt.compare(password, admin.passwordHash)
      : false;

    if (!passwordOk) {
      const attempts = (admin.failedLoginAttempts ?? 0) + 1;
      const lockedUntil =
        attempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null;

      await db.update(adminUsers)
        .set({ failedLoginAttempts: attempts, lockedUntil })
        .where(eq(adminUsers.id, admin.id));

      await logAuthAttempt({ userId: admin.id, email, ip, userAgent, status: 'failed' });

      // Auto-block IP after 10 failures in short period
      if (attempts >= 10 && ip) {
        await db.insert(blockedIps)
          .values({
            ip,
            reason: 'Auto-blocked: too many failed login attempts',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          })
          .onConflictDoNothing();
      }

      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // ✅ Password OK — check 2FA if enabled
    if (admin.totpSecret && admin.totpActivatedAt) {
      if (!totpCode) {
        return c.json({ requires2fa: true }, 200);
      }
      const totpValid = speakeasy.totp.verify({
        secret: admin.totpSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
      if (!totpValid) {
        await logAuthAttempt({ userId: admin.id, email, ip, userAgent, status: 'failed' });
        return c.json({ error: 'Invalid 2FA code' }, 401);
      }
    }

    // ✅ Credentials OK — reset failed counter
    await logAuthAttempt({ userId: admin.id, email, ip, userAgent, status: 'success' });

    await db.update(adminUsers)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip ?? undefined,
      })
      .where(eq(adminUsers.id, admin.id));

    // Create session
    const refreshTokenRaw = randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, 10);
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const [session] = await db.insert(adminSessions).values({
      adminUserId: admin.id,
      refreshTokenHash,
      userAgent,
      ipAddress: ip,
      expiresAt: sessionExpiresAt,
    }).returning();

    const accessToken = await signAccessToken({
      sub: admin.id,
      role: admin.role,
      sessionId: session.id,
    });
    const refreshToken = await signRefreshToken({
      sub: admin.id,
      sessionId: session.id,
      raw: refreshTokenRaw,
    });

    const isProd = env.NODE_ENV === 'production';
    const cookieDomain = isProd ? '.aivita.uz' : undefined;

    setCookie(c, 'access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
      domain: cookieDomain,
    });
    setCookie(c, 'refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/v1/auth/refresh',
      domain: cookieDomain,
    });

    return c.json({
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  },
);

// POST /v1/auth/refresh — rotate access token using refresh token
auth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token');
  if (!refreshToken) return c.json({ error: 'No refresh token' }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await verifyToken(refreshToken) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }

  const sessionId = payload.sessionId as string;
  const rawToken = payload.raw as string;

  const session = await db.query.adminSessions.findFirst({
    where: and(
      eq(adminSessions.id, sessionId),
      gt(adminSessions.expiresAt, new Date()),
      isNull(adminSessions.revokedAt),
    ),
  });
  if (!session) return c.json({ error: 'Session expired' }, 401);

  const valid = await bcrypt.compare(rawToken, session.refreshTokenHash);
  if (!valid) return c.json({ error: 'Invalid refresh token' }, 401);

  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, session.adminUserId),
  });
  if (!admin || !admin.isActive) return c.json({ error: 'Forbidden' }, 403);

  const accessToken = await signAccessToken({
    sub: admin.id,
    role: admin.role,
    sessionId: session.id,
  });

  const isProd = env.NODE_ENV === 'production';
  const cookieDomain = isProd ? '.aivita.uz' : undefined;
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    maxAge: 15 * 60,
    path: '/',
    domain: cookieDomain,
  });

  return c.json({ ok: true });
});

// POST /v1/auth/logout
auth.post('/logout', requireAuth, async (c) => {
  const sessionId = c.get('sessionId');
  await db.update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(adminSessions.id, sessionId));

  const isProd = env.NODE_ENV === 'production';
  const cookieDomain = isProd ? '.aivita.uz' : undefined;
  deleteCookie(c, 'access_token', { path: '/', domain: cookieDomain });
  deleteCookie(c, 'refresh_token', { path: '/v1/auth/refresh', domain: cookieDomain });

  return c.json({ ok: true });
});

// GET /v1/auth/me
auth.get('/me', requireAuth, async (c) => {
  const adminId = c.get('adminId');
  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, adminId),
    columns: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!admin) return c.json({ error: 'Not found' }, 404);
  return c.json(admin);
});

// POST /v1/auth/change-password
auth.post('/change-password',
  requireAuth,
  zValidator('json', changePasswordSchema),
  async (c) => {
    const { currentPassword, newPassword } = c.req.valid('json');
    const adminId = c.get('adminId');

    const admin = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, adminId),
    });
    if (!admin) return c.json({ error: 'Not found' }, 404);

    const currentOk = admin.passwordHash
      ? await bcrypt.compare(currentPassword, admin.passwordHash)
      : false;
    if (!currentOk) return c.json({ error: 'Current password is incorrect' }, 400);

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(adminUsers)
      .set({ passwordHash: newHash })
      .where(eq(adminUsers.id, adminId));

    return c.json({ ok: true });
  },
);

// POST /v1/auth/2fa/setup — generate TOTP secret
auth.post('/2fa/setup', requireAuth, async (c) => {
  const adminId = c.get('adminId');
  const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, adminId) });
  if (!admin) return c.json({ error: 'Not found' }, 404);

  const secret = speakeasy.generateSecret({
    length: 20,
    name: `Aivita Admin (${admin.email})`,
    issuer: 'Aivita',
  });

  // Store the temp secret (not yet activated)
  await db.update(adminUsers)
    .set({ totpSecret: secret.base32 })
    .where(eq(adminUsers.id, adminId));

  return c.json({
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  });
});

// POST /v1/auth/2fa/confirm — verify code and activate 2FA
auth.post('/2fa/confirm',
  requireAuth,
  zValidator('json', z.object({ token: z.string().length(6) })),
  async (c) => {
    const adminId = c.get('adminId');
    const { token } = c.req.valid('json');

    const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, adminId) });
    if (!admin?.totpSecret) return c.json({ error: '2FA setup not initiated' }, 400);

    const valid = speakeasy.totp.verify({
      secret: admin.totpSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!valid) return c.json({ error: 'Invalid code' }, 400);

    await db.update(adminUsers)
      .set({ totpActivatedAt: new Date() })
      .where(eq(adminUsers.id, adminId));

    return c.json({ ok: true, message: '2FA activated' });
  }
);

// POST /v1/auth/2fa/disable — disable 2FA
auth.post('/2fa/disable',
  requireAuth,
  zValidator('json', z.object({ token: z.string().length(6) })),
  async (c) => {
    const adminId = c.get('adminId');
    const { token } = c.req.valid('json');

    const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, adminId) });
    if (!admin?.totpSecret || !admin.totpActivatedAt) {
      return c.json({ error: '2FA is not enabled' }, 400);
    }

    const valid = speakeasy.totp.verify({
      secret: admin.totpSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!valid) return c.json({ error: 'Invalid code' }, 400);

    await db.update(adminUsers)
      .set({ totpSecret: null, totpActivatedAt: null })
      .where(eq(adminUsers.id, adminId));

    return c.json({ ok: true, message: '2FA disabled' });
  }
);

// GET /v1/auth/2fa/status
auth.get('/2fa/status', requireAuth, async (c) => {
  const adminId = c.get('adminId');
  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, adminId),
    columns: { totpActivatedAt: true },
  });
  return c.json({ enabled: !!(admin?.totpActivatedAt) });
});

export { auth };
