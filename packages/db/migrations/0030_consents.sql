-- consents: a patient's explicit permission for a specific partner clinic to
-- send a specific kind of clinical data into their AIVITA profile. Matrix of
-- (who × what × why × until when), with full history. ecosystem/v1 clinical
-- exchange module (discharge-document feature), building on the exchange
-- bricks already in place (migration 0026 aivita_users.external_id, 0027
-- identity_links, 0028 partner_clinics, 0029 ecosystem_appointments).
--
-- Direction: this is consent for an INBOUND flow (the partner attaches
-- something to the patient's own profile). The row only ever represents the
-- PATIENT's own decision — a partner calling ecosystem/v1 can only ever
-- check for an existing active consent, never grant one on the patient's
-- behalf. Consent is created exclusively through the patient's own
-- authenticated session, never through partner auth.
--
-- History, not mutation: revoking never deletes or overwrites a row — it
-- sets revoked_at + status='revoked' and the row stays as a permanent audit
-- record. A later re-grant is a NEW row, not a flip back to 'active'.
--
-- "Active consent" for (person, partner, scope) means: status='active' AND
-- revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()).

CREATE TABLE IF NOT EXISTS "consents" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "person_id"    uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "partner_code" text NOT NULL REFERENCES "partner_clinics"("code"),
  "scope"        text NOT NULL,
  "purpose"      text NOT NULL,
  "granted_at"   timestamptz NOT NULL DEFAULT now(),
  "revoked_at"   timestamptz,
  "expires_at"   timestamptz,
  "status"       text NOT NULL DEFAULT 'active',
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "consents_person_idx" ON "consents" ("person_id");
CREATE INDEX IF NOT EXISTS "consents_partner_idx" ON "consents" ("partner_code");
CREATE INDEX IF NOT EXISTS "consents_status_idx" ON "consents" ("status");

-- At most one ACTIVE consent per (person, partner, scope). Partial index,
-- not a plain UNIQUE table constraint, precisely so a revoked row never
-- blocks a later re-grant — only rows with status='active' count.
CREATE UNIQUE INDEX IF NOT EXISTS "consents_active_unique"
  ON "consents" ("person_id", "partner_code", "scope")
  WHERE "status" = 'active';
