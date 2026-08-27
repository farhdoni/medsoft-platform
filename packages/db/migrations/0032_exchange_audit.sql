-- exchange_audit: append-only audit trail for ecosystem/v1 operations — who
-- (partner), what (operation type), whom (person), when, under which
-- consent, and what happened. ecosystem/v1 exchange module, brick 6 (brick
-- 1: migration 0026 aivita_users.external_id, brick 2: migration 0027
-- identity_links, brick 3: migration 0028 partner_clinics, brick 4:
-- requirePartnerAuth, brick 5: resolvePatientLink + migration 0029
-- ecosystem_appointments + migration 0030 consents + migration 0031
-- discharge_documents).
--
-- Deliberately a NEW table, not a reuse of `audit_logs`: that table's
-- actor_admin_id is NOT NULL (no ON DELETE), a real invariant meaning
-- "every row is an admin action" — admin-partners.ts's issue_key/rotate_key
-- rows depend on it. Exchange operations are partner-driven (M2M via
-- requirePartnerAuth), most have no admin in the request at all, and the
-- shape this journal needs (partner_code/person_id/partner_local_id/
-- outcome/consent_id, each independently indexed) doesn't map onto
-- audit_logs' generic entity_type/entity_id/changes without either
-- loosening that invariant or burying queryable columns inside jsonb.
--
-- Append-only: inserted by lib/exchange-audit.ts's logExchangeEvent() only —
-- no UPDATE/DELETE from application code, ever.
--
-- Privacy: person_id here is the INTERNAL aivita_users.id, never handed to
-- partners (see aivita_users.external_id for the value that is). This row
-- never stores the raw partner API key, discharge-document file content, or
-- other clinical content — only operation metadata (see
-- routes/ecosystem/appointments.ts and discharge-documents.ts).
--
-- person_id / consent_id use ON DELETE SET NULL, not CASCADE like the
-- operational exchange tables (ecosystem_appointments/discharge_documents/
-- consents all cascade on person deletion) — deliberately different here:
-- this is a journal, so the row must survive the person or consent it
-- references being removed, just with the link cleared.

CREATE TABLE IF NOT EXISTS "exchange_audit" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "occurred_at"      timestamptz NOT NULL DEFAULT now(),
  "partner_code"     text NOT NULL REFERENCES "partner_clinics"("code"),
  "action"           text NOT NULL,
  "person_id"        uuid REFERENCES "aivita_users"("id") ON DELETE SET NULL,
  "partner_local_id" text,
  "outcome"          text NOT NULL,
  "consent_id"       uuid REFERENCES "consents"("id") ON DELETE SET NULL,
  "metadata"         jsonb
);

CREATE INDEX IF NOT EXISTS "exchange_audit_partner_idx" ON "exchange_audit" ("partner_code");
CREATE INDEX IF NOT EXISTS "exchange_audit_person_idx" ON "exchange_audit" ("person_id");
CREATE INDEX IF NOT EXISTS "exchange_audit_occurred_idx" ON "exchange_audit" ("occurred_at");
