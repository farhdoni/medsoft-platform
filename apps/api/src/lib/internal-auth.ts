import { timingSafeEqual } from 'node:crypto';

export type InternalAuthResult = 'ok' | 'missing_config' | 'invalid';

/**
 * Pure — no env.ts import on purpose (env.ts process.exit(1)s on an
 * incomplete environment at import time, which would otherwise crash this
 * file's tests). Callers pass the expected secret explicitly. Mirrors
 * verifyTelegramWebhookSecret's timingSafeEqual pattern in telegram.ts.
 * Distinguishes "not configured" from "wrong token" on purpose: a missing
 * expected secret means the feature is deliberately disabled (503 at the
 * call site), not a caller mistake (401).
 */
export function checkInternalServiceToken(
  headerValue: string | null | undefined,
  expectedSecret: string | undefined,
): InternalAuthResult {
  if (!expectedSecret) return 'missing_config';
  if (!headerValue) return 'invalid';
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expectedSecret);
  return a.length === b.length && timingSafeEqual(a, b) ? 'ok' : 'invalid';
}
