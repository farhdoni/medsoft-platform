-- Migration: full aivita auth (email+password, verification codes, password resets)

-- 1. New columns on aivita_users
ALTER TABLE "aivita_users"
  ADD COLUMN IF NOT EXISTS "nickname"              text UNIQUE,
  ADD COLUMN IF NOT EXISTS "google_id"             text UNIQUE,
  ADD COLUMN IF NOT EXISTS "password_hash"         text,
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until"          timestamp;

-- 2. Email verification codes
CREATE TABLE IF NOT EXISTS "aivita_email_verifications" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "code"       text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at"    timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "email_verifications_user_idx"
  ON "aivita_email_verifications"("user_id");

-- 3. Password reset tokens
CREATE TABLE IF NOT EXISTS "aivita_password_resets" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "token_hash"  text NOT NULL UNIQUE,
  "expires_at"  timestamp NOT NULL,
  "used_at"     timestamp,
  "created_at"  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "password_resets_user_idx"
  ON "aivita_password_resets"("user_id");
