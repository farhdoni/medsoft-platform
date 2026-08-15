-- identity_links: maps an AIVITA person (aivita_users) to how a partner system
-- (e.g. MedSoft) identifies the same person on their side. ecosystem/v1
-- exchange module, brick 2 (brick 1 was aivita_users.external_id, migration
-- 0026).
--
-- Matching rule enforced by convention, not by the DB: a row is only ever
-- written off a stable channel (phone/telegram/provider) — never a name
-- match. Ambiguous matches land in status='quarantine' and must never be
-- treated as valid until a human confirms them.
--
-- No structural partner/clinic table exists yet in the active schema, so
-- partner_code is a plain text code for now (TODO brick 3: replace with a
-- real partner_id FK once a partner/clinic entity exists).

CREATE TABLE IF NOT EXISTS "identity_links" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "person_id"        uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "partner_code"     text NOT NULL,
  "partner_local_id" text NOT NULL,
  "match_channel"    text NOT NULL,
  "status"           text NOT NULL DEFAULT 'quarantine',
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "identity_links_person_idx" ON "identity_links" ("person_id");
CREATE INDEX IF NOT EXISTS "identity_links_partner_idx" ON "identity_links" ("partner_code");
CREATE INDEX IF NOT EXISTS "identity_links_status_idx" ON "identity_links" ("status");

-- One partner-side record maps to at most one AIVITA person.
ALTER TABLE "identity_links"
  ADD CONSTRAINT "identity_links_partner_local_unique" UNIQUE ("partner_code", "partner_local_id");

-- One AIVITA person has at most one link per partner.
ALTER TABLE "identity_links"
  ADD CONSTRAINT "identity_links_person_partner_unique" UNIQUE ("person_id", "partner_code");
