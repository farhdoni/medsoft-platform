import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';

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
// No structural partner/clinic entity exists yet in the active schema (the
// legacy `clinics` table isn't wired to aivitaUsers-based flows, and
// `doctorProfiles.clinicName` is free text) — TODO(brick 3): replace
// `partnerCode` with a real `partnerId` FK once a partner/clinic entity is
// introduced. Until then, partnerCode is a stable text code identifying the
// partner system (e.g. 'medsoft', or a per-clinic code once partners exist).

export const identityLinks = pgTable(
  'identity_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    personId: uuid('person_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    partnerCode: text('partner_code').notNull(),

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
