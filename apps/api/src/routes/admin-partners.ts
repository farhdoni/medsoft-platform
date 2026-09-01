import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { auditLogs } from '@medsoft/db';
import { partnerClinics } from '@medsoft/db/schema/partner-clinics';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import { generatePartnerApiKey, hashPartnerApiKey } from '../lib/partner-keys.js';

// Admin-only issuance of partner API keys (ecosystem/v1 exchange module,
// brick 3 follow-up). requireAuth is the adminUsers/adminSessions guard
// (apps/api/src/middleware/auth.ts) — any authenticated AIVITA admin, same
// gate as the sibling admin-pharmacies.ts/admin-monitoring.ts routers, not
// requireAivitaAuth (that's the end-user session, a different circuit).

export const adminPartnersRouter = new Hono();
adminPartnersRouter.use('*', requireAuth);

// ─── POST / — register a new partner clinic ─────────────────────────────────
//
// Onboarding entry point. Until now a partner row could only be created by a
// raw INSERT into prod (no validation, no audit, no trail); this closes that.
//
// Deliberately does NOT issue a key and does NOT activate: a new partner is
// born 'pending' (the column default) and stays inert until an admin both
// issues a key (POST /:code/issue-key) and flips it to 'active' (PATCH
// /:code/status). Creation, key issuance, and activation are three separate
// audited actions on purpose — none is a side effect of another.
const createPartnerSchema = z.object({
  // Uppercase alphanumeric + hyphens, must start and end alphanumeric.
  // This is the value partners send as X-Partner-Code and that identity_links
  // / ecosystem_appointments / consents FK against, so keep it tight and stable.
  code: z
    .string()
    .trim()
    .regex(
      /^[A-Z0-9]([A-Z0-9-]*[A-Z0-9])?$/,
      'code must be uppercase letters, digits and hyphens, starting and ending alphanumeric',
    )
    .min(3)
    .max(40),
  name: z.string().trim().min(1, 'name must not be empty').max(200),
});

adminPartnersRouter.post('/', zValidator('json', createPartnerSchema), async (c) => {
  const { code, name } = c.req.valid('json');

  // Insert; the table's UNIQUE(code) is the real guard. onConflictDoNothing
  // means a duplicate code yields zero rows back — a clean 409 with no
  // check-then-insert race.
  const [created] = await db
    .insert(partnerClinics)
    .values({ code, name }) // status defaults to 'pending', contractVersion to 'v1'
    .onConflictDoNothing({ target: partnerClinics.code })
    .returning({
      id: partnerClinics.id,
      code: partnerClinics.code,
      name: partnerClinics.name,
      status: partnerClinics.status,
      contractVersion: partnerClinics.contractVersion,
      createdAt: partnerClinics.createdAt,
    });

  if (!created) {
    return c.json({ error: `A partner with code '${code}' already exists.` }, 409);
  }

  const adminId = c.get('adminId');
  await db
    .insert(auditLogs)
    .values({
      actorAdminId: adminId,
      action: 'partner.create',
      entityType: 'partner_clinic',
      entityId: created.id,
      metadata: { code: created.code, name: created.name, status: created.status },
      actorIp: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
      actorUserAgent: c.req.header('user-agent') ?? null,
    })
    .catch((err) => logger.error({ err, code: created.code }, 'partner.create audit insert failed'));

  return c.json(
    {
      ...created,
      nextSteps:
        'Partner created as pending. Issue a key with POST /v1/admin/partners/' +
        `${created.code}/issue-key, then activate with PATCH /v1/admin/partners/${created.code}/status ` +
        '{"status":"active"} when the clinic is ready.',
    },
    201,
  );
});

// ─── PATCH /:code/status — activate / suspend a partner ──────────────────────
//
// The only three transitions that make operational sense:
//   pending   → active     (onboard: start accepting the partner's traffic)
//   active    → suspended  (cut a working partner off immediately)
//   suspended → active     (bring a suspended partner back)
// Everything else — including any return to 'pending' and same-state no-ops —
// is rejected: 'pending' is a start state, not somewhere you send a clinic
// that has already worked, and free-form transitions are just extra ways to
// disable a partner by mistake.
//
// requirePartnerAuth already enforces status !== 'active' → 403, so suspend
// takes effect on the partner's very next request even with a valid key.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['active'],
  active: ['suspended'],
  suspended: ['active'],
};

const changeStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']),
});

adminPartnersRouter.patch('/:code/status', zValidator('json', changeStatusSchema), async (c) => {
  const code = c.req.param('code');
  const { status: to } = c.req.valid('json');

  const [partner] = await db
    .select()
    .from(partnerClinics)
    .where(eq(partnerClinics.code, code))
    .limit(1);

  if (!partner) return c.json({ error: 'Not found' }, 404);

  const from = partner.status;
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    return c.json(
      {
        error: `Cannot change status from '${from}' to '${to}'.`,
        allowed: 'pending→active, active→suspended, suspended→active',
      },
      409,
    );
  }

  await db
    .update(partnerClinics)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(partnerClinics.id, partner.id));

  const adminId = c.get('adminId');
  await db
    .insert(auditLogs)
    .values({
      actorAdminId: adminId,
      action: 'partner.status_change',
      entityType: 'partner_clinic',
      entityId: partner.id,
      // Record BOTH the previous and the new status, so the journal shows who
      // moved this partner from-what-to-what, not just where it landed.
      metadata: { code: partner.code, from, to },
      actorIp: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
      actorUserAgent: c.req.header('user-agent') ?? null,
    })
    .catch((err) => logger.error({ err, code: partner.code }, 'partner.status_change audit insert failed'));

  // Say plainly what just happened to the partner's exchange access.
  const access =
    to === 'active'
      ? 'Exchange access ENABLED — the partner authenticates on its next request (a key must have been issued).'
      : 'Exchange access REVOKED immediately — the partner now gets 403 on its next request even with a valid key.';

  return c.json({ code: partner.code, from, to, access }, 200);
});

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
// Rotation with grace (migration 0047): on an already-keyed partner the
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
