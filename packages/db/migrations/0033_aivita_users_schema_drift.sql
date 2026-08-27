-- 0033: close the drift between packages/db/src/schema/aivita.ts and the
-- migration history for aivita_users.
--
-- Seven columns are declared in the drizzle schema but created by no migration.
-- On a database built purely from 0000-0032 they simply do not exist, so every
-- `select *` against aivita_users fails — db.query.aivitaUsers.findFirst() is
-- what GET /v1/aivita/users uses, and it returns 500 with
-- `column "onboarding_step" does not exist`. Routes that project explicit
-- columns (e.g. the AV Chat messaging endpoints) were unaffected, which is why
-- this stayed hidden.
--
-- Definitions below are transcribed from the schema file, not invented:
--   onboardingStep  integer('onboarding_step').default(0).notNull()
--   isMinor         boolean('is_minor').default(false).notNull()
--   parentPhone     text('parent_phone')
--   parentRelation  text('parent_relation')
--   parentConsent   boolean('parent_consent').default(false).notNull()
--   referralCode    varchar('referral_code', { length: 20 }).unique()
--   referredBy      uuid('referred_by')
--
-- referred_by is deliberately left without a foreign key, matching the schema:
-- it is a plain uuid there, not a .references() column.

ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "onboarding_step"  integer      DEFAULT 0     NOT NULL;
--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "is_minor"         boolean      DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "parent_phone"     text;
--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "parent_relation"  text;
--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "parent_consent"   boolean      DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "referral_code"    varchar(20);
--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "referred_by"      uuid;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "aivita_users" ADD CONSTRAINT "aivita_users_referral_code_unique" UNIQUE ("referral_code");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_users_referral_code_idx" ON "aivita_users" ("referral_code");
