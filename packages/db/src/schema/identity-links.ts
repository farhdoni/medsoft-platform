import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';
import { partnerClinics } from './partner-clinics';

// ─── identity_links ─────────────────────────────────────────────────────────
//
// ecosystem/v1 exchange module, brick 2 (brick 1: aivitaUsers.externalId).
//
// Maps an AIVITA person to how a partner system (e.g. MedSoft) identifies the
// same person on their side. This is the ONLY place that association lives —
// nothing else in the schema currently links a person to an external record.
//
// Matching rule: a link is only ever created off a stable channel (phone,
// telegram, provider identity) — never off a name match. An ambiguous match
// is written as `status: 'quarantine'`, never guessed into `'active'`.
//
// brick 3 (partner-clinics.ts) introduced the partner registry: partnerCode
// is now a real FK against partnerClinics.code (a natural-key FK — code
// stays the identifying value here, no surrogate partnerId column added,
// since this table was still empty in dev when brick 3 landed and no
// resolver code depended on the old free-text column yet).

export const identityLinks = pgTable(
  'identity_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    personId: uuid('person_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    partnerCode: text('partner_code')
      .notNull()
      .references(() => partnerClinics.code),

    // How the partner identifies this same person on their side
    // (e.g. MedSoft's internal patient id / record number).
    partnerLocalId: text('partner_local_id').notNull(),

    // 'phone' | 'telegram' | 'external' | 'manual' — the stable key the match
    // was established on. Never 'name'.
    matchChannel: text('match_channel').notNull(),

    // 'active' | 'quarantine'. Defaults to 'quarantine': an ambiguous match
    // must never resolve automatically — a link only becomes 'active' when
    // resolver code explicitly says the match is unambiguous. Nothing
    // downstream should treat a quarantined link as a valid identity.
    status: text('status').notNull().default('quarantine'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    personIdx: index('identity_links_person_idx').on(table.personId),
    partnerIdx: index('identity_links_partner_idx').on(table.partnerCode),
    statusIdx: index('identity_links_status_idx').on(table.status),

    // One partner-side record maps to at most one AIVITA person.
    uniquePartnerLocal: unique('identity_links_partner_local_unique')
      .on(table.partnerCode, table.partnerLocalId),

    // One AIVITA person has at most one link per partner.
    uniquePersonPartner: unique('identity_links_person_partner_unique')
      .on(table.personId, table.partnerCode),
  })
);
