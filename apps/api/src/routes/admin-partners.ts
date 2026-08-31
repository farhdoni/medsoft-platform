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

// Default overlap window for a rotation: long enough to hand the new key to
// the partner and let them redeploy, short enough that two live keys don't
// linger for a day. Callers can override per-rotation; 0 = no grace (the old
// unconditional behaviour — the previous key dies immediately).
const DEFAULT_GRACE_HOURS = 2;
const MAX_GRACE_HOURS = 24 * 7; // hard cap so a typo can't leave an old key alive for months

// ─── POST /:code/issue-key ─────────────────────────────────────────────────
//
// Generates a new raw API key, stores only its bcrypt hash, and returns the
// raw key exactly once — it is never persisted or logged anywhere (not the
// audit trail below either: metadata only ever carries the partner code,
// whether this was a rotation, and the grace window).
//
// Rotation with grace (migration 0045): on an already-keyed partner the
// current hash is moved to previous_api_key_hash and kept valid until
// now + graceHours, so the partner's in-flight traffic keeps working while
// they switch keys. Pass { "graceHours": N } in the body to override the
// 2-hour default; graceHours: 0 revokes the old key immediately (the old
// pre-grace behaviour). To kill a still-valid previous key early (e.g. it
// leaked), use POST /:code/revoke-previous-key below.
adminPartnersRouter.post('/:code/issue-key', async (c) => {
  const code = c.req.param('code');

  const body = (await c.req.json().catch(() => ({}))) as { graceHours?: unknown };
  let graceHours = DEFAULT_GRACE_HOURS;
  if (body.graceHours !== undefined) {
    const g = Number(body.graceHours);
    if (!Number.isFinite(g) || g < 0 || g > MAX_GRACE_HOURS) {
      return c.json({ error: `graceHours must be a number between 0 and ${MAX_GRACE_HOURS}` }, 400);
    }
    graceHours = g;
  }

  const [partner] = await db.select()
    .from(partnerClinics)
    .where(eq(partnerClinics.code, code))
    .limit(1);

  if (!partner) return c.json({ error: 'Not found' }, 404);

  const wasRotation = partner.apiKeyHash !== null;

  const rawKey = generatePartnerApiKey();
  const apiKeyHash = await hashPartnerApiKey(rawKey);

  // On rotation with a grace window, keep the outgoing key alive as the
  // "previous" key until it expires. graceHours === 0 (or a first issue)
  // clears any previous key immediately.
  const withGrace = wasRotation && graceHours > 0;
  const previousKeyExpiresAt = withGrace
    ? new Date(Date.now() + graceHours * 3600_000)
    : null;

  await db.update(partnerClinics)
    .set({
      apiKeyHash,
      previousApiKeyHash: withGrace ? partner.apiKeyHash : null,
      previousKeyExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(partnerClinics.id, partner.id));

  const adminId = c.get('adminId');
  await db.insert(auditLogs).values({
    actorAdminId: adminId,
    action: wasRotation ? 'partner.rotate_key' : 'partner.issue_key',
    entityType: 'partner_clinic',
    entityId: partner.id,
    metadata: { code: partner.code, rotated: wasRotation, graceHours: withGrace ? graceHours : 0 },
    actorIp: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
    actorUserAgent: c.req.header('user-agent') ?? null,
  }).catch(() => {}); // non-fatal

  return c.json({
    code: partner.code,
    apiKey: rawKey,
    warning: 'This key is shown once and cannot be retrieved again. Store it now.',
    rotated: wasRotation,
    ...(withGrace
      ? {
          graceHours,
          previousKeyValidUntil: previousKeyExpiresAt!.toISOString(),
          rotationNote:
            `The previous key keeps working until ${previousKeyExpiresAt!.toISOString()} ` +
            `(${graceHours}h). Hand the new key to the partner and have them switch before then. ` +
            `To kill the old key sooner, call POST /v1/admin/partners/${partner.code}/revoke-previous-key.`,
        }
      : wasRotation
      ? { graceHours: 0, rotationNote: 'graceHours was 0 — the previous key was invalidated immediately (401 from now on).' }
      : {}),
  }, 201);
});

// ─── POST /:code/revoke-previous-key ────────────────────────────────────────
//
// Immediately invalidate the previous (grace-period) key without touching the
// current one — for when the old key leaks mid-window. Idempotent: a no-op if
// there is no live previous key. Never returns or logs any key material.
adminPartnersRouter.post('/:code/revoke-previous-key', async (c) => {
  const code = c.req.param('code');

  const [partner] = await db.select()
    .from(partnerClinics)
    .where(eq(partnerClinics.code, code))
    .limit(1);

  if (!partner) return c.json({ error: 'Not found' }, 404);

  const hadPrevious = partner.previousApiKeyHash !== null;

  if (hadPrevious) {
    await db.update(partnerClinics)
      .set({ previousApiKeyHash: null, previousKeyExpiresAt: null, updatedAt: new Date() })
      .where(eq(partnerClinics.id, partner.id));

    const adminId = c.get('adminId');
    await db.insert(auditLogs).values({
      actorAdminId: adminId,
      action: 'partner.revoke_previous_key',
      entityType: 'partner_clinic',
      entityId: partner.id,
      metadata: { code: partner.code },
      actorIp: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
      actorUserAgent: c.req.header('user-agent') ?? null,
    }).catch(() => {});
  }

  return c.json({
    code: partner.code,
    revoked: hadPrevious,
    message: hadPrevious
      ? 'Previous (grace-period) key invalidated immediately. The current key is unaffected.'
      : 'No live previous key to revoke — nothing changed.',
  }, 200);
});
