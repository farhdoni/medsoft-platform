import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';
import { partnerClinics } from './partner-clinics';

// ─── discharge_documents ────────────────────────────────────────────────────
//
// ecosystem/v1 clinical exchange module. A discharge document (epicrisis) a
// partner clinic attaches to a patient's own AIVITA profile — a document
// artifact (file + metadata) the patient owns, not structured clinical data.
// Structured diagnoses/lab results are explicitly v2, out of scope here (see
// task decision log) — v1 only ever stores the file the clinic already
// produced and its bibliographic metadata.
//
// Gated by consent, not by identity resolution alone: linking the patient
// (resolvePatientLink, same as ecosystem_appointments) is necessary but not
// sufficient — the endpoint that writes this table must ALSO find an active
// row in `consents` for (personId, partnerCode, scope='discharge_document')
// before it's allowed to insert. This table has no FK into consents and no
// consent snapshot column on purpose: it isn't the record of "consent
// existed at write time" (consents' own granted_at/revoked_at history is
// that record) — it's the record of "this file exists", full stop.
//
// filePath is a storage key, not a raw OS path: relative to the uploads
// root (e.g. 'discharge/<generated-name>.pdf'), same shape a future S3
// object key would take. Never returned to the partner in an API response —
// only the internal AIVITA document id is (see routes/ecosystem/
// discharge-documents.ts).
//
// UNIQUE(partner_code, partner_document_id) is the same ON-CONFLICT-DO-
// NOTHING idempotency pattern ecosystem_appointments (migration 0029) and
// identity_links (migration 0027) already use: a partner retrying the same
// upload (e.g. after a timed-out response) must land on the same document
// row, never a duplicate file on disk.

export const dischargeDocuments = pgTable(
  'discharge_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    personId: uuid('person_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    partnerCode: text('partner_code')
      .notNull()
      .references(() => partnerClinics.code),

    // The partner's own id for this document. Idempotency key together with
    // partnerCode — see file header.
    partnerDocumentId: text('partner_document_id').notNull(),

    // Storage key relative to the uploads root — see file header. Never
    // exposed in an API response.
    filePath: text('file_path').notNull(),

    // Original filename as sent by the partner (sanitized before storage —
    // see routes/ecosystem/discharge-documents.ts), kept for display only.
    fileName: text('file_name').notNull(),

    mimeType: text('mime_type').notNull(),

    fileSize: integer('file_size').notNull(),

    // Discharge date, as reported by the partner — a date, not an instant
    // (matches labResults.testedAt's use of `date`, not `timestamp`, for
    // the same "clinical event date" shape).
    issuedAt: date('issued_at').notNull(),

    // Partner's own free-text labels — not FKs, same reasoning as
    // ecosystem_appointments.doctorLabel/serviceLabel: the doctor/clinic
    // here belongs to the partner, AIVITA has no directory row to point at.
    doctorLabel: text('doctor_label'),
    clinicLabel: text('clinic_label'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    personIdx: index('discharge_documents_person_idx').on(table.personId),
    partnerIdx: index('discharge_documents_partner_idx').on(table.partnerCode),

    uniquePartnerDocument: unique('discharge_documents_partner_unique')
      .on(table.partnerCode, table.partnerDocumentId),
  })
);
