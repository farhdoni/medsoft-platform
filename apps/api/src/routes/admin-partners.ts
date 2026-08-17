import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { auditLogs } from '@medsoft/db';
import { partnerClinics } from '@medsoft/db/schema/partner-clinics';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { generatePartnerApiKey, hashPartnerApiKey } from '../lib/partner-keys.js';

// Admin-only issuance of partner API keys (ecosystem/v1 exchange module,
// brick 3 follow-up). requireAuth is the adminUsers/adminSessions guard
// (apps/api/src/middleware/auth.ts) — any authenticated AIVITA admin, same
// gate as the sibling admin-pharmacies.ts/admin-monitoring.ts routers, not
// requireAivitaAuth (that's the end-user session, a different circuit).

export const adminPartnersRouter = new Hono();
adminPartnersRouter.use('*', requireAuth);

// ─── POST /:code/issue-key ─────────────────────────────────────────────────
//
// Generates a new raw API key, stores only its bcrypt hash, and returns the
// raw key exactly once — it is never persisted or logged anywhere (not the
// audit trail below either: metadata only ever carries the partner code and
// whether this was a rotation).
//
// Rotation: calling this again on an already-keyed partner overwrites
// apiKeyHash, invalidating the previous key immediately. For MVP this is
// intentional and unconditional — no grace period, no dual-key window. Any
// integration still using the old key starts getting 401s the moment the
// new key is issued; the caller of this endpoint is responsible for handing
// the new key to the partner before their traffic breaks.
adminPartnersRouter.post('/:code/issue-key', async (c) => {
  const code = c.req.param('code');

  const [partner] = await db.select()
    .from(partnerClinics)
    .where(eq(partnerClinics.code, code))
    .limit(1);

  if (!partner) return c.json({ error: 'Not found' }, 404);

  const wasRotation = partner.apiKeyHash !== null;

  const rawKey = generatePartnerApiKey();
  const apiKeyHash = await hashPartnerApiKey(rawKey);

  await db.update(partnerClinics)
    .set({ apiKeyHash, updatedAt: new Date() })
    .where(eq(partnerClinics.id, partner.id));

  const adminId = c.get('adminId');
  await db.insert(auditLogs).values({
    actorAdminId: adminId,
    action: wasRotation ? 'partner.rotate_key' : 'partner.issue_key',
    entityType: 'partner_clinic',
    entityId: partner.id,
    metadata: { code: partner.code, rotated: wasRotation },
    actorIp: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
    actorUserAgent: c.req.header('user-agent') ?? null,
  }).catch(() => {}); // non-fatal

  return c.json({
    code: partner.code,
    apiKey: rawKey,
    warning: 'This key is shown once and cannot be retrieved again. Store it now.',
    rotated: wasRotation,
    ...(wasRotation
      ? { rotationNote: 'Any integration still using the previous key will now get 401 Unauthorized — it was invalidated immediately.' }
      : {}),
  }, 201);
});
