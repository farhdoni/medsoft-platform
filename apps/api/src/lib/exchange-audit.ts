import { db } from '@medsoft/db';
import { exchangeAudit } from '@medsoft/db/schema/exchange-audit';
import { logger } from './logger.js';

// Single write point for the ecosystem/v1 exchange journal (exchange_audit,
// migration 0032) — who (partner), what (action), whom (person), when, under
// which consent, and what happened (outcome). Both ecosystem/v1 routes call
// this after every outcome is known, success or not.
//
// Never throws: the journal is a record OF the operation, not a gate ON it.
// A partner's push must not fail with a 500 because the audit insert hit a
// transient DB issue — the clinical/booking write already succeeded (or
// correctly didn't) before this is called, and losing one journal row is a
// far smaller problem than turning a successful partner-facing response
// into a false failure. Insert errors are logged loudly instead, since a
// silently-broken journal is its own incident.

export type ExchangeAction = 'appointment.push' | 'discharge.push';

export type ExchangeOutcome =
  | 'created'
  | 'duplicate'
  | 'no_match'
  | 'ambiguous'
  | 'quarantine'
  | 'conflict'
  | 'denied_no_consent'
  | 'error';

export interface ExchangeEvent {
  partnerCode: string;
  action: ExchangeAction;
  outcome: ExchangeOutcome;
  // Internal aivita_users.id — never the partner-facing externalId. Omit/
  // null whenever identity resolution didn't land on a single person.
  personId?: string | null;
  partnerLocalId?: string | null;
  // Only when this operation actually checked consent and found an active
  // row. Never fabricate one for outcomes that never reached the check.
  consentId?: string | null;
  // Non-sensitive context only — see exchange-audit.ts schema comment.
  // Never the raw partner key, file bytes, fileName, or clinical content.
  metadata?: Record<string, unknown> | null;
}

export async function logExchangeEvent(event: ExchangeEvent): Promise<void> {
  try {
    await db.insert(exchangeAudit).values({
      partnerCode: event.partnerCode,
      action: event.action,
      outcome: event.outcome,
      personId: event.personId ?? null,
      partnerLocalId: event.partnerLocalId ?? null,
      consentId: event.consentId ?? null,
      metadata: event.metadata ?? null,
    });
  } catch (err) {
    logger.error({ err, event }, 'exchange_audit insert failed — main operation not affected');
  }
}
