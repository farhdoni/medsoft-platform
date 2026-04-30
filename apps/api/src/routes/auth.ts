import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '@medsoft/db';
import { adminUsers, adminSessions } from '@medsoft/db';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { env } from '../env.js';
import { loginSchema, changePasswordSchema } from '@medsoft/shared';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const auth = new Hono();

// POST /v1/auth/login — email + password
auth.post('/login',
  rateLimit('admin-login', 10, 300),
  zValidator('json', loginSchema),
  async (c) => {
    const { email, password } = c.req.valid('json');

    const admin = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, email.toLowerCase().trim()),
    });

    // Do not reveal whether the user exists
    if (!admin) {
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

      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // ✅ Credentials OK — reset failed counter
    const ip = c.req.header('x-forwarded-for') ?? null;
    const userAgent = c.req.header('user-agent') ?? null;

    await db.update(adminUsers)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
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

export { auth };
