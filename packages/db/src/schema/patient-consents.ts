import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita.js';

// ─── patient_consents ───────────────────────────────────────────────────────
//
// A patient's own consent to data processing / marketing emails — kept
// separate from `consents` (packages/db/src/schema/consents.ts), which is
// documented there as inbound-only: partner clinics writing data INTO a
// patient's profile. This table is the opposite direction and a different
// legal event entirely (the patient agreeing to something about their own
// data), so it isn't modeled as a row in that table.
//
// One row per consent type per grant/revoke event (not upserted in place),
// so the history of what a user actually agreed to, and when, is never lost
// — `revoked_at` closes a row out rather than deleting it. `textVersion` is
// a free string (a dated version tag of the actual consent text shown, kept
// in a plain file for legal review, not in this schema) so which wording a
// user actually agreed to is always reconstructable.
export const patientConsents = pgTable(
  'patient_consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    // 'data_processing' (mandatory, gates onboarding completion) |
    // 'marketing_emails' (optional). Free text, not a pgEnum, matching the
    // survey_prompts.field precedent — new consent types shouldn't need a
    // migration to add.
    consentType: text('consent_type').notNull(),

    granted: boolean('granted').notNull(),
    textVersion: text('text_version').notNull(),

    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => ({
    userTypeIdx: index('patient_consents_user_type_idx').on(table.userId, table.consentType),
  })
);
