-- Patient's own consent to data processing / marketing emails (Part B, the
-- new Consent screen). Separate from `consents`, which is inbound-only:
-- partner clinics writing data into a patient's profile — a different
-- direction and a different legal event, not modeled as a row there.
--
-- Applied unconditionally on every API boot (see apps/api/src/index.ts's
-- migration runner) — CREATE TABLE/INDEX IF NOT EXISTS is safe to re-run.

CREATE TABLE IF NOT EXISTS "patient_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "consent_type" text NOT NULL,
  "granted" boolean NOT NULL,
  "text_version" text NOT NULL,
  "granted_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_consents_user_type_idx" ON "patient_consents" ("user_id", "consent_type");
