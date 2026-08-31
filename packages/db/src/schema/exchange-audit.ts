import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';
import { partnerClinics } from './partner-clinics';
import { consents } from './consents';

// ─── exchange_audit ─────────────────────────────────────────────────────────
//
// Append-only audit trail for ecosystem/v1 operations — who (partner), what
// (operation type), whom (person), when, under which consent, and what
// happened. ecosystem/v1 exchange module, brick 6.
//
// Deliberately a NEW table, not a reuse of `audit_logs`: that table's
// actor_admin_id is NOT NULL, a real invariant ("every row is an admin
// action") that admin-partners.ts's issue_key/rotate_key rows depend on.
// Exchange operations are partner-driven (M2M via requirePartnerAuth), most
// have no admin in the request at all, and this journal's shape
// (partner_code/person_id/partner_local_id/outcome/consent_id, each
// independently indexed) doesn't map onto audit_logs' generic
// entity_type/entity_id/changes without either loosening that invariant or
// burying queryable columns inside jsonb.
//
// Append-only: written by apps/api/src/lib/exchange-audit.ts's
// logExchangeEvent() only — no UPDATE/DELETE from application code.
//
// Privacy: personId is the INTERNAL aivita_users.id (fine here — this table
// is never exposed to partners, only externalId ever is). Never store the
// raw partner API key, discharge-document file content, or other clinical
// content in metadata — operation metadata only (see the two ecosystem/v1
// route files for what actually goes in it).
//
// personId/consentId use onDelete: 'set null', NOT 'cascade' like the
// operational exchange tables (ecosystemAppointments/dischargeDocuments/
// consents all cascade on person deletion) — deliberately different here:
// a journal row must survive the person or consent it references being
// removed, just with the link cleared, not disappear with it.

export const exchangeAudit = pgTable(
  'exchange_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),

    // Nullable since migration 0044: an auth-reject row for an unknown or
    // absent partner code has no real partner to point at. The FK still
    // applies to non-null values; the "business rows always carry a
    // partner_code" invariant moved from NOT NULL to a CHECK
    // (partner_code IS NOT NULL OR action = 'auth.reject'), see migration 0044.
    partnerCode: text('partner_code')
      .references(() => partnerClinics.code),

    // Raw partner code the caller SENT, kept even when it matches no partner
    // (a brute-forcer guessing codes) — the only trace of a guessed code.
    // No FK, deliberately: it may reference a partner that does not exist.
    // Migration 0044.
    attemptedPartnerCode: text('attempted_partner_code'),

    // Request source for auth-reject events (x-real-ip / x-forwarded-for).
    // Migration 0044.
    sourceIp: text('source_ip'),

    // e.g. 'appointment.push' | 'discharge.push' | 'auth.reject' — one journal
    // entry per ecosystem/v1 write attempt or auth rejection, whatever its
    // outcome.
    action: text('action').notNull(),

    // Internal person id. Null when identity resolution never landed on a
    // single person (no_match / ambiguous).
    personId: uuid('person_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),

    // Partner's own id for the patient, kept even when personId is null —
    // the only trace left for a no_match event.
    partnerLocalId: text('partner_local_id'),

    // 'created' | 'duplicate' | 'no_match' | 'ambiguous' | 'quarantine' |
    // 'conflict' | 'denied_no_consent' | 'error'. Plain text, not an enum —
    // same reasoning as consents.scope/identityLinks.status: new outcomes
    // shouldn't need a migration.
    outcome: text('outcome').notNull(),

    // Set only when the operation actually checked consent and found an
    // active row (i.e. discharge.push reaching the created/duplicate/
    // conflict outcomes). Null for appointment.push (no consent gate exists
    // there) and for any discharge outcome reached before/instead of the
    // consent check (no_match/quarantine/ambiguous/denied_no_consent).
    consentId: uuid('consent_id').references(() => consents.id, { onDelete: 'set null' }),

    // Non-sensitive operation context only — e.g. partnerAppointmentId /
    // partnerDocumentId / matchChannel / a validation-error reason code.
    // Never the raw partner API key, file bytes, fileName, or clinical
    // content (diagnoses, service/doctor labels, phone numbers).
    metadata: jsonb('metadata'),
  },
  (table) => ({
    partnerIdx: index('exchange_audit_partner_idx').on(table.partnerCode),
    personIdx: index('exchange_audit_person_idx').on(table.personId),
    occurredIdx: index('exchange_audit_occurred_idx').on(table.occurredAt),
    attemptedCodeIdx: index('exchange_audit_attempted_code_idx').on(table.attemptedPartnerCode),
    sourceIpIdx: index('exchange_audit_source_ip_idx').on(table.sourceIp),
  })
);
