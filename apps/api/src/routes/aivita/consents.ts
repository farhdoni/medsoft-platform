import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { consents } from '@medsoft/db/schema/consents';
import { partnerClinics } from '@medsoft/db/schema/partner-clinics';
import { and, eq, isNull } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

// Patient-facing consent endpoints (ecosystem/v1 clinical exchange module).
// requireAivitaAuth, NOT requirePartnerAuth — a consent row may only ever
// be created or revoked by the patient it belongs to, acting under their
// own session. This is the ONLY place an 'active' consents row gets
// written; routes/ecosystem/discharge-documents.ts only ever reads via
// hasActiveConsent(), never writes.

export const aivitaConsentsRouter = new Hono();
aivitaConsentsRouter.use('*', requireAivitaAuth);

const grantSchema = z.object({
  partnerCode: z.string().min(1),
  scope: z.string().min(1),
  purpose: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

// POST / — grant consent to a partner for a scope. Idempotent: granting
// again while already active just returns the existing active row rather
// than creating a second one (the DB's partial unique index would reject a
// second 'active' row anyway — this just avoids surfacing that as an
// error to a well-behaved caller).
aivitaConsentsRouter.post('/', zValidator('json', grantSchema), async (c) => {
  const personId = c.get('aivitaUserId');
  const body = c.req.valid('json');

  const [partner] = await db.select()
    .from(partnerClinics)
    .where(eq(partnerClinics.code, body.partnerCode))
    .limit(1);

  if (!partner || partner.status !== 'active') {
    return c.json({ error: 'Unknown or inactive partner clinic' }, 404);
  }

  const [existing] = await db.select()
    .from(consents)
    .where(and(
      eq(consents.personId, personId),
      eq(consents.partnerCode, body.partnerCode),
      eq(consents.scope, body.scope),
      eq(consents.status, 'active'),
      isNull(consents.revokedAt),
    ))
    .limit(1);

  if (existing) {
    return c.json({ data: existing, alreadyGranted: true });
  }

  try {
    const [inserted] = await db.insert(consents).values({
      personId,
      partnerCode: body.partnerCode,
      scope: body.scope,
      purpose: body.purpose,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    }).returning();

    return c.json({ data: inserted, alreadyGranted: false }, 201);
  } catch {
    // Lost a race against a concurrent grant for the same (person, partner,
    // scope) — consents_active_unique caught it. Return the winner.
    const [raced] = await db.select()
      .from(consents)
      .where(and(
        eq(consents.personId, personId),
        eq(consents.partnerCode, body.partnerCode),
        eq(consents.scope, body.scope),
        eq(consents.status, 'active'),
        isNull(consents.revokedAt),
      ))
      .limit(1);

    if (!raced) throw new Error('consent insert conflicted but no active row found');
    return c.json({ data: raced, alreadyGranted: true });
  }
});

// POST /:id/revoke — revoke a consent the caller owns. Never deletes the
// row (see schema file header) — sets revokedAt + status='revoked'.
aivitaConsentsRouter.post('/:id/revoke', async (c) => {
  const personId = c.get('aivitaUserId');
  const id = c.req.param('id');

  const [existing] = await db.select()
    .from(consents)
    .where(and(eq(consents.id, id), eq(consents.personId, personId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Not found' }, 404);

  if (existing.status === 'revoked') {
    return c.json({ data: existing, alreadyRevoked: true });
  }

  const [updated] = await db.update(consents)
    .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(consents.id, id))
    .returning();

  return c.json({ data: updated, alreadyRevoked: false });
});
