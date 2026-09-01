-- 0046: record ecosystem/v1 partner-auth REJECTIONS in exchange_audit.
--
-- Before this, requirePartnerAuth returned 401/403 BEFORE logExchangeEvent,
-- so key brute-force left zero trace in the journal (confirmed on the live
-- contract test: auth-fail rows = 0). Auth rejections now get a journal row.
--
-- Schema changes so an attempt can be logged even when its partner_code is
-- unknown or absent (a brute-forcer guessing codes, or sending none):
--   * partner_code -> nullable. Its FK already permits NULL; business rows
--     still always set it, now enforced by the CHECK below instead of by
--     NOT NULL, so a business row can never silently lose its partner.
--   * attempted_partner_code (NO FK) -> the raw code the caller sent, even if
--     no such partner exists. This is the only trace of a guessed code.
--   * source_ip -> request source for auth-reject events.
-- New outcome values ('no_key' | 'bad_key' | 'inactive' | 'rate_limited') and
-- the new action 'auth.reject' are plain text and need no migration.

ALTER TABLE "exchange_audit" ALTER COLUMN "partner_code" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "exchange_audit" ADD COLUMN IF NOT EXISTS "attempted_partner_code" text;
--> statement-breakpoint
ALTER TABLE "exchange_audit" ADD COLUMN IF NOT EXISTS "source_ip" text;
--> statement-breakpoint
-- Invariant preserved: only auth-rejection rows may omit partner_code; every
-- business-operation row still carries a real (FK-checked) partner_code.
DO $$ BEGIN
  ALTER TABLE "exchange_audit"
    ADD CONSTRAINT "exchange_audit_partner_code_or_auth"
    CHECK ("partner_code" IS NOT NULL OR "action" = 'auth.reject');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchange_audit_attempted_code_idx" ON "exchange_audit" ("attempted_partner_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchange_audit_source_ip_idx" ON "exchange_audit" ("source_ip");
