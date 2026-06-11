-- 0021: aivita_sessions — refresh-token store for revocable sessions (v2 auth)
--
-- Adds a server-side session table so refresh tokens can be revoked.
-- Access tokens remain stateless JWTs (1h). Refresh tokens (7d) are stored
-- here as SHA-256 hashes. The raw token is only ever in the HttpOnly cookie.
--
-- Migration is additive (CREATE TABLE IF NOT EXISTS) — no data is mutated.
-- Existing 30-day tokens continue to work; they are validated via the legacy
-- path in requireAivitaAuth and expire naturally.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_sessions" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             UUID NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "refresh_token_hash"  TEXT NOT NULL,
  "user_agent"          TEXT,
  "ip_address"          TEXT,
  "device_info"         TEXT,
  "expires_at"          TIMESTAMPTZ NOT NULL,
  "revoked_at"          TIMESTAMPTZ,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_sessions_user_id_idx"
  ON "aivita_sessions" ("user_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_sessions_expires_at_idx"
  ON "aivita_sessions" ("expires_at");
