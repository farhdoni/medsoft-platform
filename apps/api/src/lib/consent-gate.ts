import { db } from '@medsoft/db';
import { aivitaUsers, patientConsents } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { isSoft3dEnabled } from '@medsoft/shared';

/**
 * Pure decision: should a write to one of the ladder's data-collecting
 * endpoints (q1/parent-consent/q2/anamnesis) be allowed?
 *
 * Flag-gated on purpose, same as the ladder's UI: none of the 29 real
 * accounts on prod have a patient_consents row today (the table is brand
 * new) — an unconditional consent requirement here would 403 every write
 * for every account the moment this deploys, on endpoints that are
 * supposed to be invisible to everyone except SOFT3D_TEST_ACCOUNTS. For a
 * non-flagged account this always allows the write — behavior stays
 * exactly what it is today, everywhere, including endpoints this gate
 * doesn't even apply to (survey-banner, health-profile, Flow A's own
 * /onboarding/step — none of those call this at all). Once an account is
 * flagged, a missing/ungranted data_processing consent row blocks the
 * write, same as the UI already routes a flagged-but-unconsented account
 * to /consent first (page.tsx).
 */
export function shouldAllowConsentGatedWrite(isFlagged: boolean, hasDataProcessingConsent: boolean): boolean {
  if (!isFlagged) return true;
  return hasDataProcessingConsent;
}

/** DB-touching wrapper — looks up the account's flag status and (only if
 *  flagged) whether it has a granted data_processing consent row. Any row
 *  (even a historically revoked one) satisfies this — revocation is a
 *  distinct, not-yet-built flow; what matters here is that the person was
 *  asked and answered once. */
export async function assertConsentIfFlagged(userId: string): Promise<boolean> {
  const [user] = await db.select({ email: aivitaUsers.email }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  const flagged = isSoft3dEnabled(user?.email);

  if (!flagged) return shouldAllowConsentGatedWrite(false, false);

  const row = await db.query.patientConsents.findFirst({
    where: (t, { and: andOp, eq: eqOp }) => andOp(eqOp(t.userId, userId), eqOp(t.consentType, 'data_processing'), eqOp(t.granted, true)),
  });
  return shouldAllowConsentGatedWrite(true, !!row);
}
