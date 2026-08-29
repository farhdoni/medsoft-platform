-- discharge_documents: a discharge document (epicrisis) a partner clinic
-- attaches to a patient's own AIVITA profile — a document artifact (file +
-- metadata) the patient owns, not structured clinical data. ecosystem/v1
-- clinical exchange module, built on migration 0030 (consents) and the
-- earlier exchange bricks (0026 aivita_users.external_id, 0027
-- identity_links, 0028 partner_clinics, 0029 ecosystem_appointments).
--
-- Gated by consent, not identity resolution alone: the endpoint writing
-- this table must find an active row in `consents` for (person_id,
-- partner_code, scope='discharge_document') before inserting. No FK into
-- consents here — this table records "this file exists", the consent
-- history lives entirely in consents.
--
-- file_path is a storage key relative to the uploads root (e.g.
-- 'discharge/<generated-name>.pdf'), not a raw OS path — same shape a
-- future S3 object key would take. Never returned to the partner in an API
-- response.
--
-- UNIQUE(partner_code, partner_document_id): same ON-CONFLICT-DO-NOTHING
-- idempotency pattern as ecosystem_appointments (migration 0029) — a
-- partner retrying the same upload must land on the same document row,
-- never a duplicate file on disk.

CREATE TABLE IF NOT EXISTS "discharge_documents" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "person_id"           uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "partner_code"        text NOT NULL REFERENCES "partner_clinics"("code"),
  "partner_document_id" text NOT NULL,
  "file_path"           text NOT NULL,
  "file_name"           text NOT NULL,
  "mime_type"           text NOT NULL,
  "file_size"           integer NOT NULL,
  "issued_at"           date NOT NULL,
  "doctor_label"        text,
  "clinic_label"        text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "discharge_documents_person_idx" ON "discharge_documents" ("person_id");
CREATE INDEX IF NOT EXISTS "discharge_documents_partner_idx" ON "discharge_documents" ("partner_code");

ALTER TABLE "discharge_documents"
  ADD CONSTRAINT "discharge_documents_partner_unique" UNIQUE ("partner_code", "partner_document_id");
