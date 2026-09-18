// Pure decision logic for POST /v1/aivita/auth/register's "email already
// exists" branch — split out from the route handler so the cooldown/
// attempt-limit/verified-vs-unverified branching is directly unit-testable
// without a real DB or email provider (matches the same pure-extraction
// pattern used elsewhere in this repo, e.g. apps/api/src/lib/survey-queue.ts).
//
// Context: /register used to create the aivita_users row THEN send the
// verification email; if the send failed (Resend rejected the domain,
// network blip, etc.) the row was already committed but the client got a
// bare 500 with no userId — a permanently stuck, unrecoverable "orphaned"
// account, since the email/nickname were now taken but nobody could ever
// verify or delete that row. The DB-write compensation (delete the row if
// the send throws) lives in the route handler itself, next to the real
// db.transaction/db.delete calls — this module only decides WHAT the
// route should do about an email that's already in aivita_users:
//  - verified            -> tell the caller to sign in instead
//  - unverified, cooled   -> resend a fresh code to the SAME row
//  - unverified, too soon -> cooldown (not more than once/minute)
//  - unverified, too many -> hard cap (spam/abuse guard)
//  - not found at all     -> proceed with normal creation

export const RESEND_COOLDOWN_MS = 60_000;
export const MAX_RESEND_ATTEMPTS_PER_WINDOW = 5;
export const RESEND_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

export type RegistrationDecision =
  | { action: 'create' }
  | { action: 'already_verified' }
  | { action: 'nickname_taken' }
  | { action: 'resend'; userId: string }
  | { action: 'resend_cooldown'; retryAfterSeconds: number }
  | { action: 'too_many_attempts' };

export interface ExistingUserByEmail {
  id: string;
  emailVerified: Date | null;
}

/**
 * @param existingByEmail row matching the submitted email, or null
 * @param existingByNicknameId id of a (different) row matching the
 *   submitted nickname, or null — irrelevant once existingByEmail already
 *   decided the outcome, since we're resending to that same account.
 * @param recentCodeCreatedAts this user's aivitaEmailVerifications rows
 *   created within RESEND_ATTEMPT_WINDOW_MS, newest first
 * @param now injected for deterministic tests, not `new Date()` internally
 */
export function decideRegistration(
  existingByEmail: ExistingUserByEmail | null,
  existingByNicknameId: string | null,
  recentCodeCreatedAts: Date[],
  now: Date,
): RegistrationDecision {
  if (existingByEmail) {
    if (existingByEmail.emailVerified) return { action: 'already_verified' };

    if (recentCodeCreatedAts.length >= MAX_RESEND_ATTEMPTS_PER_WINDOW) {
      return { action: 'too_many_attempts' };
    }

    const last = recentCodeCreatedAts[0];
    if (last) {
      const elapsedMs = now.getTime() - last.getTime();
      if (elapsedMs < RESEND_COOLDOWN_MS) {
        return {
          action: 'resend_cooldown',
          retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000),
        };
      }
    }

    return { action: 'resend', userId: existingByEmail.id };
  }

  if (existingByNicknameId) return { action: 'nickname_taken' };

  return { action: 'create' };
}
