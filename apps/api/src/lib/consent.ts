import { db } from '@medsoft/db';
import { consents } from '@medsoft/db/schema/consents';
import { and, eq, gt, isNull, or } from 'drizzle-orm';

// Read-side helper for the consents table (ecosystem/v1 clinical exchange
// module). Mirrors the exact definition of "active" the partial unique
// index consents_active_unique enforces at the DB level (migration 0030):
// status='active' AND revokedAt IS NULL AND (expiresAt IS NULL OR
// expiresAt in the future). Keeping this in one place means the write-side
// constraint and the read-side check can never silently drift apart.
//
// This only ever answers "does an active consent exist" — it never creates,
// revokes, or otherwise mutates a consent. Granting only ever happens
// through the patient's own authenticated session; see
// routes/aivita/consents.ts.
//
// getActiveConsent returns the row's id (not just a boolean) so callers that
// need to record WHICH consent an operation relied on — the ecosystem/v1
// exchange journal, exchange_audit.consent_id — can do so without a second
// query. hasActiveConsent is a thin wrapper for callers that only need the
// yes/no answer.

export async function getActiveConsent(
  personId: string,
  partnerCode: string,
  scope: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: consents.id })
    .from(consents)
    .where(and(
      eq(consents.personId, personId),
      eq(consents.partnerCode, partnerCode),
      eq(consents.scope, scope),
      eq(consents.status, 'active'),
      isNull(consents.revokedAt),
      or(isNull(consents.expiresAt), gt(consents.expiresAt, new Date())),
    ))
    .limit(1);

  return row ?? null;
}

export async function hasActiveConsent(
  personId: string,
  partnerCode: string,
  scope: string,
): Promise<boolean> {
  return (await getActiveConsent(personId, partnerCode, scope)) !== null;
}
