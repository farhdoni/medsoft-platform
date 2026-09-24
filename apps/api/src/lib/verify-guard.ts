// Pure decision logic for POST /v1/aivita/auth/verify-email's wrong-code
// attempt limiting — same shape as the failedLoginAttempts/lockedUntil
// pattern password login already uses (auth.ts's /login handler), applied
// here to email-code guessing instead of password guessing. Split out for
// the same reason as registration-guard.ts: directly unit-testable without
// a real DB.

export const MAX_VERIFY_ATTEMPTS = 5;
export const VERIFY_LOCKOUT_MS = 15 * 60 * 1000;

export type VerifyLockState =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

/** Is this account currently locked out of code verification? */
export function checkVerifyLock(lockedUntil: Date | null, now: Date): VerifyLockState {
  if (lockedUntil && lockedUntil > now) {
    return { locked: true, retryAfterSeconds: Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000) };
  }
  return { locked: false };
}

/** Called after a wrong code — returns the new attempts count + lockedUntil to persist. */
export function nextVerifyLockState(
  failedAttempts: number,
  now: Date,
): { attempts: number; lockedUntil: Date | null } {
  const attempts = failedAttempts + 1;
  const lockedUntil = attempts >= MAX_VERIFY_ATTEMPTS ? new Date(now.getTime() + VERIFY_LOCKOUT_MS) : null;
  return { attempts, lockedUntil };
}
