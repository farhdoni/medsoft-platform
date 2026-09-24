-- Wrong-code attempt limiting for POST /v1/aivita/auth/verify-email (shared
-- by both the password-registration and new passwordless flows) — same
-- attempts/lockout shape as failed_login_attempts/locked_until, kept as
-- separate columns since a wrong OTP guess and a wrong password are
-- different events with different callers.

ALTER TABLE "aivita_users"
  ADD COLUMN IF NOT EXISTS "email_verify_failed_attempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "email_verify_locked_until" timestamp;
