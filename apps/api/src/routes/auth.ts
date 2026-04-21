import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { randomBytes } from 'crypto';
import { db } from '@medsoft/db';
import { adminUsers, adminSessions } from '@medsoft/db';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { redis } from '../lib/redis';
import { env } from '../env';
import { signAccessToken, signRefreshToken, verifyToken } from '../services/tokens';
import { generateTotpSecret, generateQrDataUrl, verifyTotpCode, generateBackupCodes, verifyBackupCode } from '../services/totp';
import { sendMagicLink } from '../services/email';
import { logger } from '../middleware/logger';
import { requireAuth } from '../middleware/auth';
import bcrypt from 'bcrypt';

export const authRouter = new Hono();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'Strict' as const,
  path: '/',
};

authRouter.post('/magic-link',
  zValidator('json', z.object({ email: z.string().email() })),
  async (c) => {
    const { email } = c.req.valid('json');
    const [admin] = await db.select().from(adminUsers).where(
      and(eq(adminUsers.email, email.toLowerCase()), eq(adminUsers.isActive, true))
    ).limit(1);

    if (admin) {
      const token = randomBytes(32).toString('hex');
      await redis.setex(`magic:${token}`, env.MAGIC_LINK_TTL, admin.id);
      const url = `${env.MAGIC_LINK_BASE_URL}?token=${token}`;
      await sendMagicLink(email, url);
    }

    return c.json({ message: 'If this email is registered, you will receive a login link.' });
  }
);

authRouter.post('/verify-magic-link',
  zValidator('json', z.object({ token: z.string() })),
  async (c) => {
    const { token } = c.req.valid('json');
    const adminId = await redis.get(`magic:${token}`);
    if (!adminId) return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired link' } }, 401);

    await redis.del(`magic:${token}`);
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1);
    if (!admin || !admin.isActive) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Account disabled' } }, 401);

    const challengeToken = randomBytes(32).toString('hex');
    await redis.setex(`challenge:${challengeToken}`, 300, adminId);

    if (admin.totpActivatedAt) {
      return c.json({ requires_2fa: true, challenge_token: challengeToken });
    }

    const setupToken = randomBytes(32).toString('hex');
    await redis.setex(`setup:${setupToken}`, 600, adminId);
    return c.json({ requires_2fa_setup: true, setup_token: setupToken });
  }
);

authRouter.post('/setup-2fa',
  zValidator('json', z.object({ setup_token: z.string() })),
  async (c) => {
    const { setup_token } = c.req.valid('json');
    const adminId = await redis.get(`setup:${setup_token}`);
    if (!adminId) return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired setup token' } }, 401);

    const secret = generateTotpSecret();
    await redis.setex(`totp_pending:${adminId}`, 600, secret.base32);
    const qrDataUrl = await generateQrDataUrl(secret.otpauth_url!);

    return c.json({ otpauth_url: secret.otpauth_url, qr_data_url: qrDataUrl, setup_token });
  }
);

authRouter.post('/activate-2fa',
  zValidator('json', z.object({ setup_token: z.string(), totp_code: z.string() })),
  async (c) => {
    const { setup_token, totp_code } = c.req.valid('json');
    const adminId = await redis.get(`setup:${setup_token}`);
    if (!adminId) return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid setup token' } }, 401);

    const pendingSecret = await redis.get(`totp_pending:${adminId}`);
    if (!pendingSecret) return c.json({ error: { code: 'SETUP_EXPIRED', message: 'Setup session expired' } }, 401);

    const valid = verifyTotpCode(pendingSecret, totp_code);
    if (!valid) return c.json({ error: { code: 'INVALID_CODE', message: 'Invalid TOTP code' } }, 400);

    const { plain, hashed } = await generateBackupCodes();
    await db.update(adminUsers).set({
      totpSecret: pendingSecret,
      totpActivatedAt: new Date(),
      backupCodesHash: hashed,
      updatedAt: new Date(),
    }).where(eq(adminUsers.id, adminId));

    await redis.del(`setup:${setup_token}`);
    await redis.del(`totp_pending:${adminId}`);

    return c.json({ backup_codes: plain, message: 'Save these codes securely. They will not be shown again.' });
  }
);

authRouter.post('/verify-2fa',
  zValidator('json', z.object({ challenge_token: z.string(), code: z.string(), is_backup: z.boolean().default(false) })),
  async (c) => {
    const { challenge_token, code, is_backup } = c.req.valid('json');
    const adminId = await redis.get(`challenge:${challenge_token}`);
    if (!adminId) return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired challenge' } }, 401);

    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1);
    if (!admin || !admin.isActive || !admin.totpSecret) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);

    let valid = false;
    if (is_backup) {
      const idx = await verifyBackupCode(code, admin.backupCodesHash || []);
      if (idx >= 0) {
        valid = true;
        const newCodes = [...(admin.backupCodesHash || [])];
        newCodes.splice(idx, 1);
        await db.update(adminUsers).set({ backupCodesHash: newCodes, backupCodesUsedCount: admin.backupCodesUsedCount + 1 }).where(eq(adminUsers.id, adminId));
      }
    } else {
      valid = verifyTotpCode(admin.totpSecret, code);
    }

    if (!valid) return c.json({ error: { code: 'INVALID_CODE', message: 'Invalid code' } }, 400);

    await redis.del(`challenge:${challenge_token}`);

    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null;
    const ua = c.req.header('user-agent') || null;
    const refreshTokenRaw = randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, 10);

    const [session] = await db.insert(adminSessions).values({
      adminUserId: adminId,
      refreshTokenHash,
      ipAddress: ip as never,
      userAgent: ua,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
    }).returning();

    await db.update(adminUsers).set({ lastLoginAt: new Date(), lastLoginIp: ip as never, updatedAt: new Date() }).where(eq(adminUsers.id, adminId));

    const tokenPayload = { sub: adminId, email: admin.email, role: admin.role, sessionId: session.id };
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken({ ...tokenPayload, sessionId: session.id });
    const rawRefreshForCookie = `${session.id}.${refreshTokenRaw}`;

    setCookie(c, 'access_token', accessToken, { ...COOKIE_OPTS, maxAge: env.JWT_ACCESS_TTL });
    setCookie(c, 'refresh_token', rawRefreshForCookie, { ...COOKIE_OPTS, maxAge: env.JWT_REFRESH_TTL });

    return c.json({ message: 'Logged in', role: admin.role });
  }
);

authRouter.post('/refresh', async (c) => {
  const rawRefresh = getCookie(c, 'refresh_token');
  if (!rawRefresh) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);

  const [sessionId, ...rest] = rawRefresh.split('.');
  const rawToken = rest.join('.');

  const [session] = await db.select().from(adminSessions).where(
    and(eq(adminSessions.id, sessionId), isNull(adminSessions.revokedAt), gt(adminSessions.expiresAt, new Date()))
  ).limit(1);

  if (!session) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);

  const valid = await bcrypt.compare(rawToken, session.refreshTokenHash);
  if (!valid) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.adminUserId)).limit(1);
  if (!admin || !admin.isActive) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);

  await db.update(adminSessions).set({ revokedAt: new Date() }).where(eq(adminSessions.id, sessionId));

  const newRawRefresh = randomBytes(32).toString('hex');
  const newHash = await bcrypt.hash(newRawRefresh, 10);
  const [newSession] = await db.insert(adminSessions).values({
    adminUserId: admin.id,
    refreshTokenHash: newHash,
    expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
  }).returning();

  const payload = { sub: admin.id, email: admin.email, role: admin.role, sessionId: newSession.id };
  const accessToken = await signAccessToken(payload);
  const rawRefreshForCookie = `${newSession.id}.${newRawRefresh}`;

  setCookie(c, 'access_token', accessToken, { ...COOKIE_OPTS, maxAge: env.JWT_ACCESS_TTL });
  setCookie(c, 'refresh_token', rawRefreshForCookie, { ...COOKIE_OPTS, maxAge: env.JWT_REFRESH_TTL });

  return c.json({ message: 'Token refreshed' });
});

authRouter.post('/logout', requireAuth, async (c) => {
  const rawRefresh = getCookie(c, 'refresh_token');
  if (rawRefresh) {
    const [sessionId] = rawRefresh.split('.');
    await db.update(adminSessions).set({ revokedAt: new Date() }).where(eq(adminSessions.id, sessionId)).catch(() => {});
  }
  deleteCookie(c, 'access_token');
  deleteCookie(c, 'refresh_token');
  return c.json({ message: 'Logged out' });
});

authRouter.get('/me', requireAuth, (c) => {
  const admin = c.get('admin' as never) as Record<string, unknown>;
  const { totpSecret, backupCodesHash, ...safe } = admin as Record<string, unknown>;
  void totpSecret; void backupCodesHash;
  return c.json(safe);
});
