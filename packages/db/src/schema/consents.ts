import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { aivitaUsers } from './aivita';
import { partnerClinics } from './partner-clinics';

// ─── consents ───────────────────────────────────────────────────────────────
//
// ecosystem/v1 clinical exchange module. A patient's explicit permission for
// a specific partner clinic to send a specific kind of clinical data into
// their AIVITA profile — a matrix of (who × what × why × until when), with
// full history.
//
// Direction matters here: this is consent for an INBOUND flow (the partner
// attaches something to the patient's own profile), not the outbound
// data-sharing consent a full ecosystem contract will eventually need too.
// The row only ever represents the PATIENT's own decision — nothing in this
// schema, and nothing in the endpoints that read it, may ever create an
// 'active' row on the patient's behalf. A partner calling ecosystem/v1 can
// only ever check for an existing active consent, never grant one; consent
// is created exclusively through the patient's own authenticated session
// (requireAivitaAuth), never through requirePartnerAuth.
//
// scope is the "what data" axis — e.g. 'discharge_document' for v1 (a
// clinic attaching an epicrisis file). Plain text, not an enum: v2 will add
// more scopes (structured diagnoses, lab results, etc.) and this table
// shouldn't need a migration for each one.
//
// History, not mutation: revoking a consent never deletes or overwrites the
// row — it sets revokedAt + status='revoked' and the row stays as a
// permanent audit record. A later re-grant is a NEW row, not a flip back to
// 'active' on the old one (same "never mutate history" instinct as
// identityLinks/partnerClinics never deleting a link/partner row either).
//
// "Active consent" for a (person, partner, scope) means: status='active'
// AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now()). The
// partial unique index below enforces at most one such row at a time at the
// DB level, not just in application code — see hasActiveConsent() in
// apps/api/src/lib/consent.ts for the read-side query this constraint
// protects.

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    personId: uuid('person_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    partnerCode: text('partner_code')
      .notNull()
      .references(() => partnerClinics.code),

    // "What data" — e.g. 'discharge_document'. Free text, see file header.
    scope: text('scope').notNull(),

    // "Why" — human-readable reason shown to the patient when they granted
    // it (e.g. "MedSoft attaches your discharge documents to your AIVITA
    // profile"). Free text, not a FK/enum — same reasoning as scope.
    purpose: text('purpose').notNull(),

    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),

    // NULL while active. Set exactly once, at revocation — never cleared
    // back to NULL (that would be re-granting the same row, which this
    // table deliberately never does; see file header).
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    // "Until when" — NULL means no expiry. Optional: v1 always grants
    // open-ended consent from the patient side, but the column exists so
    // hasActiveConsent()'s expiry check is real from day one rather than a
    // TODO bolted on later.
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // 'active' | 'revoked'. Defaults to 'active' — unlike identityLinks
    // (defaults to 'quarantine', since an ambiguous match must never be
    // trusted automatically), a consent row is only ever inserted at the
    // moment the patient actually grants it, so there is no "unconfirmed"
    // state to default to here.
    status: text('status').notNull().default('active'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    personIdx: index('consents_person_idx').on(table.personId),
    partnerIdx: index('consents_partner_idx').on(table.partnerCode),
    statusIdx: index('consents_status_idx').on(table.status),

    // At most one ACTIVE consent per (person, partner, scope) — a revoked
    // row doesn't count, so re-granting after a revoke is never blocked.
    // Partial unique index, not a plain UNIQUE table constraint, precisely
    // so history can accumulate freely while "active" stays singular.
    activeUnique: uniqueIndex('consents_active_unique')
      .on(table.personId, table.partnerCode, table.scope)
      .where(sql`${table.status} = 'active'`),
  })
);
