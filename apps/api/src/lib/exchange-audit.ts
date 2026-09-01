import { db } from '@medsoft/db';
import { exchangeAudit } from '@medsoft/db/schema/exchange-audit';
import { logger } from './logger.js';

// Single write point for the ecosystem/v1 exchange journal (exchange_audit,
// migration 0032) — who (partner), what (action), whom (person), when, under
// which consent, and what happened (outcome). The two ecosystem/v1 routes
// call this after every business outcome; requirePartnerAuth calls it for
// every auth REJECTION (migration 0046) so key brute-force is no longer
// invisible.
//
// Never throws: the journal is a record OF the operation, not a gate ON it.
// A partner's push must not fail with a 500 because the audit insert hit a
// transient DB issue — the clinical/booking write already succeeded (or
// correctly didn't) before this is called, and losing one journal row is a
// far smaller problem than turning a successful partner-facing response
// into a false failure. Insert errors are logged loudly instead, since a
// silently-broken journal is its own incident.
//
// It NEVER records the raw partner API key or any part of it — auth-reject
// rows carry only the attempted partner code, source ip, outcome and time.

export type ExchangeAction = 'appointment.push' | 'discharge.push' | 'auth.reject';

export type ExchangeOutcome =
  // business outcomes
  | 'created'
  | 'duplicate'
  | 'no_match'
  | 'ambiguous'
  | 'quarantine'
  | 'conflict'
  | 'denied_no_consent'
  | 'error'
  // auth.reject outcomes (migration 0046)
  | 'no_key' // missing X-Partner-Key and/or X-Partner-Code header
  | 'bad_key' // no such partner, no key issued, or key mismatch (incl. expired grace key)
  | 'inactive' // valid key but partner status !== 'active'
  | 'rate_limited'; // too many failed attempts from this ip / for this code

export interface ExchangeEvent {
  action: ExchangeAction;
  outcome: ExchangeOutcome;
  // Real, FK-checked partner code. Null on an auth.reject whose code is
  // unknown/absent (business events always set it — DB CHECK enforces that).
  partnerCode?: string | null;
  // Raw partner code the caller SENT (no FK) — set on auth.reject events so a
  // guessed/nonexistent code still leaves a trace. Migration 0046.
  attemptedPartnerCode?: string | null;
  // Request source ip for auth.reject events. Migration 0046.
  sourceIp?: string | null;
  // Internal aivita_users.id — never the partner-facing externalId. Omit/
  // null whenever identity resolution didn't land on a single person.
  personId?: string | null;
  partnerLocalId?: string | null;
  // Only when this operation actually checked consent and found an active
  // row. Never fabricate one for outcomes that never reached the check.
  consentId?: string | null;
  // Non-sensitive context only — see exchange-audit.ts schema comment.
  // Never the raw partner key (or any part of it), file bytes, fileName, or
  // clinical content.
  metadata?: Record<string, unknown> | null;
}

export async function logExchangeEvent(event: ExchangeEvent): Promise<void> {
  try {
    await db.insert(exchangeAudit).values({
      action: event.action,
      outcome: event.outcome,
      partnerCode: event.partnerCode ?? null,
      attemptedPartnerCode: event.attemptedPartnerCode ?? null,
      sourceIp: event.sourceIp ?? null,
      personId: event.personId ?? null,
      partnerLocalId: event.partnerLocalId ?? null,
      consentId: event.consentId ?? null,
      metadata: event.metadata ?? null,
    });
  } catch (err) {
    logger.error({ err, event }, 'exchange_audit insert failed — main operation not affected');
  }
}
