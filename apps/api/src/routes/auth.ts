import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '@medsoft/db';
import { adminUsers, adminSessions } from '@medsoft/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { redis } from '../lib/redis.js';
import { sendMagicLink } from '../lib/email.js';
import { signAccessToken, signRefreshToken, signTempToken, verifyToken } from '../lib/jwt.js';
import { generateTotpSecret, verifyTotpCode, getTotpUri } from '../lib/totp.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { env } from '../env.js';
import {
  sendMagicLinkSchema,
  verifyMagicLinkSchema,
  verifyTotpSchema,
  activateTotpSchema,
} from '@medsoft/shared';

const MAGIC_LINK_PREFIX = 'ml:';
const TOTP_SETUP_PREFIX = 'totp_setup:';

const auth = new Hono();

auth.post('/magic-link',
  rateLimit('magic-link', 5, 300),
  zValidator('json', sendMagicLinkSchema),
  async (c) => {
    const { email } = c.req.valid('json');
    const admin = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, email),
    });
    // Always return 200 to avoid email enumeration
    if (!admin || !admin.isActive) {
      return c.json({ message: 'If that email exists, a link was sent.' });
    }

    const token = randomBytes(32).toString('hex');
    const key = `${MAGIC_LINK_PREFIX}${token}`;
    await redis.setex(key, env.MAGIC_LINK_EXPIRES_SECONDS, admin.id);
    await sendMagicLink(email, token);

    return c.json({ message: 'If that email exists, a link was sent.' });
  }
);

auth.post('/verify-magic-link',
  rateLimit('verify-ml', 20, 300),
  zValidator('json', verifyMagicLinkSchema),
  async (c) => {
    const { token } = c.req.valid('json');
    const key = `${MAGIC_LINK_PREFIX}${token}`;
    const adminId = await redis.get(key);
    if (!adminId) return c.json({ error: 'Invalid or expired token' }, 400);

    await redis.del(key);

    const admin = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, adminId),
    });
    if (!admin || !admin.isActive) return c.json({ error: 'Account not found' }, 404);

    if (!admin.totpActivatedAt) {
      const tempToken = await signTempToken({ sub: admin.id, step: 'setup_totp' });
      return c.json({ step: 'setup_totp', tempToken });
    }

    const tempToken = await signTempToken({ sub: admin.id, step: 'verify_totp' });
    return c.json({ step: 'verify_totp', tempToken });
  }
);

auth.post('/setup-totp',
  async (c) => {
    const body = await c.req.json();
    const tempToken = body.tempToken;
    if (!tempToken) return c.json({ error: 'Missing token' }, 400);

    let payload: Record<string, unknown>;
    try {
      payload = await verifyToken(tempToken) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Invalid token' }, 400);
    }
    if (payload.step !== 'setup_totp') return c.json({ error: 'Invalid step' }, 400);

    const adminId = payload.sub as string;
    const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, adminId) });
    if (!admin) return c.json({ error: 'Not found' }, 404);

    const secret = generateTotpSecret(admin.email);
    const setupKey = `${TOTP_SETUP_PREFIX}${adminId}`;
    await redis.setex(setupKey, 600, secret.base32);

    return c.json({
      otpAuthUrl: getTotpUri(secret),
      secret: secret.base32,
      tempToken,
    });
  }
);

auth.post('/activate-totp',
  zValidator('json', activateTotpSchema),
  async (c) => {
    const { code, tempToken } = c.req.valid('json');

    let payload: Record<string, unknown>;
    try {
      payload = await verifyToken(tempToken) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Invalid token' }, 400);
    }
    if (payload.step !== 'setup_totp') return c.json({ error: 'Invalid step' }, 400);

    const adminId = payload.sub as string;
    const setupKey = `${TOTP_SETUP_PREFIX}${adminId}`;
    const secretBase32 = await redis.get(setupKey);
    if (!secretBase32) return c.json({ error: 'Setup session expired' }, 400);

    if (!verifyTotpCode(secretBase32, code)) {
      return c.json({ error: 'Invalid TOTP code' }, 400);
    }

    await db.update(adminUsers)
      .set({ totpSecret: secretBase32, totpActivatedAt: new Date() })
      .where(eq(adminUsers.id, adminId));
    await redis.del(setupKey);

    return c.json({ message: 'TOTP activated' });
  }
);

auth.post('/verify-totp',
  rateLimit('verify-totp', 10, 300),
  zValidator('json', verifyTotpSchema),
  async (c) => {
    const { code, tempToken } = c.req.valid('json');

    let payload: Record<string, unknown>;
    try {
      payload = await verifyToken(tempToken) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Invalid token' }, 400);
    }
    if (payload.step !== 'verify_totp') return c.json({ error: 'Invalid step' }, 400);

    const adminId = payload.sub as string;
    const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, adminId) });
    if (!admin || !admin.totpSecret) return c.json({ error: 'Not found' }, 404);

    if (!verifyTotpCode(admin.totpSecret, code)) {
      return c.json({ error: 'Invalid TOTP code' }, 400);
    }

    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const userAgent = c.req.header('user-agent') ?? null;
    const ip = c.req.header('x-forwarded-for') ?? null;

    const refreshTokenRaw = randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, 10);

    const [session] = await db.insert(adminSessions).values({
      adminUserId: admin.id,
      refreshTokenHash,
      userAgent,
      ipAddress: ip,
      expiresAt,
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

    await db.update(adminUsers)
      .set({ lastLoginAt: new Date(), lastLoginIp: ip })
      .where(eq(adminUsers.id, admin.id));

    const isProd = env.NODE_ENV === 'production';
    setCookie(c, 'access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 15 * 60,
      path: '/',
    });
    setCookie(c, 'refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/v1/auth/refresh',
    });

    return c.json({
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  }
);

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
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    maxAge: 15 * 60,
    path: '/',
  });

  return c.json({ ok: true });
});

auth.post('/logout', requireAuth, async (c) => {
  const sessionId = c.get('sessionId');
  await db.update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(adminSessions.id, sessionId));

  deleteCookie(c, 'access_token', { path: '/' });
  deleteCookie(c, 'refresh_token', { path: '/v1/auth/refresh' });

  return c.json({ ok: true });
});

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

export { auth };
