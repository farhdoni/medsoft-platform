import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { db } from '@medsoft/db';
import { partnerClinics } from '@medsoft/db/schema/partner-clinics';
import { eq } from 'drizzle-orm';
import { verifyPartnerApiKey } from '../lib/partner-keys.js';
import { logExchangeEvent } from '../lib/exchange-audit.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

// M2M auth for partner-system requests (ecosystem/v1), separate from
// requireAivitaAuth (user JWT session, cookie-based). A partner clinic
// (e.g. MedSoft) authenticates with a static API key issued via
// POST /v1/admin/partners/:code/issue-key — see routes/admin-partners.ts.
//
// Two headers, not one: X-Partner-Code identifies which partner_clinics
// row to check, X-Partner-Key is the raw secret verified against its
// bcrypt hash. Both go in headers, never query string (a key in a URL ends
// up in access/proxy logs — an unacceptable leak vector). Not
// Authorization: Bearer, to stay visually distinct from user-session tokens.
//
// Both "no such partner" and "wrong key" return the same 401 body — never
// tell a caller with a bad key whether the code they guessed exists.
//
// Three hardening additions (migrations 0044/0045):
//  1. Every rejection is journaled to exchange_audit via logExchangeEvent
//     (action 'auth.reject'). Before this, 401/403 were returned before any
//     audit call, so key brute-force left no trace. The raw key is NEVER
//     written — only the attempted code, source ip, outcome and time.
//  2. Failed attempts are rate-limited per source ip AND per attempted code
//     (a brute-forcer rotating ips is still caught by the code counter, and
//     vice-versa). Fail-CLOSED: if Redis is unreachable the limiter cannot
//     do its job, so the request is refused with 503 rather than waved
//     through — this guard exists precisely for the moments an attacker
//     might try to knock Redis over. A legitimate clinic authenticates with
//     a valid key and never increments the FAILURE counters, so it is never
//     rate-limited no matter its request volume.
//  3. Grace-period key rotation: a request is accepted against the previous
//     key too, but only while partner.previousKeyExpiresAt is in the future.

export type PartnerClinic = typeof partnerClinics.$inferSelect;

declare module 'hono' {
  interface ContextVariableMap {
    partnerClinic: PartnerClinic;
  }
}

// 5 failed attempts within 15 minutes trips the limit. A real clinic keeps
// its key in config and does not fail auth, so this only ever bites abuse.
const RL_MAX = 5;
const RL_WINDOW_SEC = 15 * 60;
const RL_PREFIX = 'rl:partnerauth:';

function clientIp(c: Context): string {
  return (
    c.req.header('x-real-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// Gate: is any counter already at/over the limit? Fail-CLOSED — a Redis
// failure is reported so the caller returns 503, never "allow".
async function rlOverLimit(keys: string[]): Promise<boolean | 'redis_down'> {
  try {
    for (const k of keys) {
      const v = await redis.get(RL_PREFIX + k);
      if (v && parseInt(v, 10) >= RL_MAX) return true;
    }
    return false;
  } catch {
    return 'redis_down';
  }
}

// Increment failure counters. Returns true if any counter JUST reached the
// limit (the crossing) so the caller can journal a single 'rate_limited'
// row instead of one per subsequently-blocked request (which would flood
// the audit under a sustained attack).
async function rlRegisterFailure(keys: string[]): Promise<boolean> {
  let crossed = false;
  try {
    for (const k of keys) {
      const rk = RL_PREFIX + k;
      const n = await redis.incr(rk);
      if (n === 1) await redis.expire(rk, RL_WINDOW_SEC);
      if (n === RL_MAX) crossed = true;
    }
  } catch (err) {
    logger.error({ err }, 'partner-auth: failed to record auth-failure in rate limiter (Redis)');
  }
  return crossed;
}

export const requirePartnerAuth = createMiddleware(async (c, next) => {
  const partnerCode = c.req.header('X-Partner-Code') ?? null;
  const rawKey = c.req.header('X-Partner-Key');
  const ip = clientIp(c);

  const rlKeys = [`ip:${ip}`];
  if (partnerCode) rlKeys.push(`code:${partnerCode}`);

  // ── 1. rate-limit gate (fail-CLOSED) ──────────────────────────────────
  const over = await rlOverLimit(rlKeys);
  if (over === 'redis_down') {
    logger.error(
      { ip, attemptedPartnerCode: partnerCode },
      'partner-auth: rate limiter unavailable (Redis) — refusing request (fail-closed)',
    );
    return c.json({ error: 'Service unavailable' }, 503);
  }
  if (over) {
    // Already blocked — return 429 without re-journaling (the crossing was
    // logged once already; see rlRegisterFailure).
    return c.json({ error: 'Too many requests' }, 429);
  }

  // Record a rejection: journal it (never the key), bump failure counters
  // (unless this is a valid-key case like an inactive partner), and journal
  // one 'rate_limited' row if this failure just tripped the limit.
  const reject = async (
    outcome: 'no_key' | 'bad_key' | 'inactive',
    httpStatus: 401 | 403,
    realPartnerCode: string | null,
    countAsFailure: boolean,
  ) => {
    await logExchangeEvent({
      action: 'auth.reject',
      outcome,
      partnerCode: realPartnerCode,
      attemptedPartnerCode: partnerCode,
      sourceIp: ip,
    });
    if (countAsFailure) {
      const crossed = await rlRegisterFailure(rlKeys);
      if (crossed) {
        await logExchangeEvent({
          action: 'auth.reject',
          outcome: 'rate_limited',
          partnerCode: null,
          attemptedPartnerCode: partnerCode,
          sourceIp: ip,
        });
      }
    }
    return c.json(
      { error: httpStatus === 403 ? 'Forbidden' : 'Unauthorized' },
      httpStatus,
    );
  };

  // ── 2. presence ───────────────────────────────────────────────────────
  if (!rawKey || !partnerCode) {
    return reject('no_key', 401, null, true);
  }

  // ── 3. look up partner ────────────────────────────────────────────────
  const [partner] = await db
    .select()
    .from(partnerClinics)
    .where(eq(partnerClinics.code, partnerCode))
    .limit(1);

  if (!partner) {
    // Same body as a wrong key — don't reveal whether the code exists.
    return reject('bad_key', 401, null, true);
  }

  // ── 4. verify current key, then the grace (previous) key if still live ─
  let ok = partner.apiKeyHash
    ? await verifyPartnerApiKey(rawKey, partner.apiKeyHash)
    : false;
  let usedGraceKey = false;
  if (
    !ok &&
    partner.previousApiKeyHash &&
    partner.previousKeyExpiresAt &&
    partner.previousKeyExpiresAt.getTime() > Date.now()
  ) {
    ok = await verifyPartnerApiKey(rawKey, partner.previousApiKeyHash);
    usedGraceKey = ok;
  }
  if (!ok) {
    return reject('bad_key', 401, partner.code, true);
  }

  // ── 5. status ─────────────────────────────────────────────────────────
  // Valid key but suspended/pending: a real 403, NOT a brute-force signal,
  // so it is audited but does NOT count toward the failure limit (never lock
  // out a legitimate partner's ip just because they were suspended).
  if (partner.status !== 'active') {
    return reject('inactive', 403, partner.code, false);
  }

  if (usedGraceKey) {
    // Tell the partner (and us) they're on the deprecated key so they switch
    // before the grace window closes. Never logged as a rejection.
    c.header('X-Partner-Key-Deprecated', 'true');
    logger.warn(
      { code: partner.code, ip, previousKeyExpiresAt: partner.previousKeyExpiresAt },
      'partner authenticated with a grace-period (previous) key — should switch to the new key before it expires',
    );
  }

  c.set('partnerClinic', partner);
  await next();
});
