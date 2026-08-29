-- partner_clinics: registry of external clinic systems (e.g. MedSoft)
-- connected to the AIVITA ecosystem, at the CLINIC level (not per-branch).
-- AIVITA owns the contract; a row here is a partner clinic onboarded to
-- plug into it. ecosystem/v1 exchange module, brick 3 (brick 1: migration
-- 0026 aivita_users.external_id, brick 2: migration 0027 identity_links).
--
-- Deliberately a NEW table, not the legacy `clinics` table: `clinics` is an
-- active, differently-scoped marketplace entity (physical clinic listings —
-- doctors_count, revenue_this_month_uzs, working_hours, commission_percent,
-- its own CRUD, FK'd from doctors/appointments). Reusing it here would
-- conflate partner-auth concerns with marketplace-listing churn.
--
-- Security: api_key_hash stores only a bcrypt hash of the partner's API
-- key (same pattern as admin_sessions.refresh_token_hash) — the raw key is
-- generated once, shown to the partner once, and never persisted. Null
-- until a key has actually been issued. Key issuance + the auth middleware
-- that checks incoming requests against this table are the NEXT step; this
-- migration is the registry + hash storage only.

CREATE TABLE IF NOT EXISTS "partner_clinics" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"              text NOT NULL,
  "name"              text NOT NULL,
  "api_key_hash"      text,
  "status"            text NOT NULL DEFAULT 'pending',
  "contract_version"  text NOT NULL DEFAULT 'v1',
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "partner_clinics_status_idx" ON "partner_clinics" ("status");

-- Also the FK target for identity_links.partner_code below — the UNIQUE
-- constraint doubles as its index, so no separate index on "code".
ALTER TABLE "partner_clinics"
  ADD CONSTRAINT "partner_clinics_code_unique" UNIQUE ("code");

-- identity_links (brick 2, migration 0027) was still empty in dev when this
-- landed and no resolver code depended on partner_code being free text yet,
-- so partner_code becomes a real FK in place — natural-key FK against
-- partner_clinics(code), no surrogate partner_clinic_id column needed.
ALTER TABLE "identity_links"
  ADD CONSTRAINT "identity_links_partner_code_fkey"
  FOREIGN KEY ("partner_code") REFERENCES "partner_clinics"("code");
