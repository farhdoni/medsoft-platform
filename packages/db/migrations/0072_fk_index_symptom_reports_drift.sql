-- Schema-drift closure (read-only audit 2026-09-26, restored-copy-verified
-- against a fresh dump — zero FK-orphan rows and zero unique-index dupes
-- confirmed before writing this, on all 11 objects below):
--
-- 8 foreign keys declared in the Drizzle schema but missing from every
-- migration file (same class of gap as 0061/0062/0066) — delete rules below
-- copied verbatim from prod's actual pg_constraint definitions, not guessed.
-- 3 unique indexes, same story (aivita_users.referral_code included).
-- 2 existing indexes whose migration-file definition doesn't match what's
-- actually on prod (symptom_reports_city_idx missing created_at;
-- ai_chat_archives_user_idx missing DESC) — dropped and recreated to match.
-- symptom_reports column drift — prod is the source of truth here (its
-- shape is what apps/api/src/routes/aivita/outbreak.ts is actually written
-- against): adds the missing created_at column, and brings defaults/
-- nullability in line with prod. temperature's `text` type (the app
-- validates it as a number but calls .toString() before writing — see that
-- route) is deliberately NOT touched in this migration.
--
-- Deliberately NOT included: pharmacy_payouts (0007_payments.sql declares
-- it, prod doesn't have it — pre-existing, unrelated to this cleanup, left
-- for whenever the pharmacies feature itself is worked on) and
-- notification_settings.health_alerts/push_enabled (orphaned — no schema.ts
-- declaration, no code reference anywhere, only 1 row on prod with both at
-- their default `true` — a drop candidate, not touched here; see PR notes).

-- ─── 8 missing foreign keys ──────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "aivita_device_tokens" ADD CONSTRAINT "aivita_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_email_verifications" ADD CONSTRAINT "aivita_email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_password_resets" ADD CONSTRAINT "aivita_password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_users" ADD CONSTRAINT "aivita_users_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "public"."aivita_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "landing_content" ADD CONSTRAINT "landing_content_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_cards" ADD CONSTRAINT "medical_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ─── 3 missing unique indexes ────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "aivita_users" ADD CONSTRAINT "aivita_users_referral_code_key" UNIQUE("referral_code");
EXCEPTION
 -- See 0066's own note: a named UNIQUE constraint's backing index can
 -- already exist from an earlier partial run, which raises duplicate_table
 -- (42P07) rather than duplicate_object (42710) for the constraint itself.
 WHEN duplicate_object OR duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_pair_severity_key" UNIQUE("drug1","drug2","severity");
EXCEPTION
 WHEN duplicate_object OR duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_name_key" UNIQUE("name");
EXCEPTION
 WHEN duplicate_object OR duplicate_table THEN null;
END $$;
--> statement-breakpoint

-- ─── symptom_reports: bring migration definition in line with prod ─────────
-- (before the index fix below, which references the created_at column
-- this adds — confirmed live: reversing this order made the index
-- statement fail with "column \"created_at\" does not exist" on a fresh DB)

ALTER TABLE "symptom_reports" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "symptom_reports" ALTER COLUMN "city" SET DEFAULT 'Ташкент';
--> statement-breakpoint
ALTER TABLE "symptom_reports" ALTER COLUMN "disease_category" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "symptom_reports" ALTER COLUMN "reported_at" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "symptom_reports" ALTER COLUMN "severity" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "symptom_reports" ALTER COLUMN "source" SET DEFAULT 'vitals';
--> statement-breakpoint
ALTER TABLE "symptom_reports" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint

-- ─── 2 indexes whose composition didn't match prod ──────────────────────────

DROP INDEX IF EXISTS "symptom_reports_city_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_reports_city_idx" ON "symptom_reports" ("city","created_at");
--> statement-breakpoint
DROP INDEX IF EXISTS "ai_chat_archives_user_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_chat_archives_user_idx" ON "ai_chat_archives" ("user_id","created_at" DESC);
