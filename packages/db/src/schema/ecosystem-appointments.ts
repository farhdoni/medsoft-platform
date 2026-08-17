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

// ─── ecosystem_appointments ─────────────────────────────────────────────────
//
// An inbound record of an appointment fact pushed by a partner clinic (e.g.
// MedSoft) about their own patient. ecosystem/v1 exchange module, first live
// endpoint (brick 1: aivitaUsers.externalId, brick 2: identityLinks, brick 3:
// partnerClinics, brick 4: requirePartnerAuth, brick 5: resolvePatientLink).
//
// Deliberately NOT the legacy `appointments` table or `aivitaAppointments`:
// both FK doctorId to a directory of doctors AIVITA itself operates. The
// doctor and the slot here belong to the PARTNER — there is no AIVITA
// doctor row to point at, so doctorLabel/serviceLabel are plain text in the
// partner's own vocabulary, never FKs.
//
// Anti-double-booking here is exchange-level idempotency, not slot-conflict
// checking: AIVITA doesn't own the partner's slot. UNIQUE(partnerCode,
// partnerAppointmentId) is the same ON-CONFLICT-DO-NOTHING pattern
// identityLinks already uses — never check-then-insert.

export const ecosystemAppointments = pgTable(
  'ecosystem_appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    personId: uuid('person_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    partnerCode: text('partner_code')
      .notNull()
      .references(() => partnerClinics.code),

    // Kept alongside personId for audit/debug traceability even though the
    // person is already resolved — not used for lookups (identity_links
    // owns that index).
    partnerLocalId: text('partner_local_id').notNull(),

    // The partner's own appointment/record id. Idempotency key together
    // with partnerCode.
    partnerAppointmentId: text('partner_appointment_id').notNull(),

    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),

    // Partner's own vocabulary — free text, not FKs (see file header).
    serviceLabel: text('service_label'),
    doctorLabel: text('doctor_label'),

    // Partner-reported status. AIVITA doesn't run a state machine over it —
    // this is a record of what the partner told us, not a resource we own.
    status: text('status').notNull().default('scheduled'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    personIdx: index('ecosystem_appointments_person_idx').on(table.personId),
    partnerIdx: index('ecosystem_appointments_partner_idx').on(table.partnerCode),

    uniquePartnerAppointment: unique('ecosystem_appointments_partner_unique')
      .on(table.partnerCode, table.partnerAppointmentId),
  })
);
