-- Add password-based auth columns to admin_users
-- Keeps existing TOTP/magic-link columns for safe rollback if needed

ALTER TABLE "admin_users"
  ADD COLUMN IF NOT EXISTS "password_hash" text,
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;
