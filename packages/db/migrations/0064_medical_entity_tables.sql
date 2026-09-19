-- health_checkups, lab_results, outbreak_snapshots: all three already exist
-- on production with columns/types/defaults/FKs matching the Drizzle schema
-- exactly (confirmed read-only 2026-09-18). No-op on prod, closes the
-- disaster-recovery gap.
--
-- symptom_reports is DIFFERENT — it already exists on prod too, but with
-- real, uninvestigated drift from the schema, found while writing this
-- migration (not fixed here — CREATE TABLE IF NOT EXISTS below is a no-op
-- against the existing table either way; nothing here can touch it):
--   - user_id: schema nullable, prod NOT NULL
--   - temperature: schema numeric(4,1), prod text (TYPE mismatch)
--   - disease_category: schema nullable, prod NOT NULL
--   - severity: schema nullable, prod NOT NULL
--   - reported_at: schema NOT NULL, prod nullable
--   - user_id FK: schema ON DELETE SET NULL, prod ON DELETE CASCADE
--   - prod has an extra "created_at" column the schema does not declare at
--     all (separate from "reported_at", which the schema does have)
--   - prod's only index is named symptom_reports_city_idx like the schema's,
--     but ON (city, created_at) instead of the schema's (city) alone — the
--     other 3 indexes the schema declares don't exist on prod under any
--     name yet, so CREATE INDEX IF NOT EXISTS below actually creates them
--     (additive, no risk); the pre-existing "city_idx" is left exactly as
--     it is on prod.
-- None of this is touched here — types, nullability and the FK's ON DELETE
-- behavior are all explicitly off-limits for this cleanup. Reported in
-- full in the cleanup's STOP-GATE for a deliberate decision later.

CREATE TABLE IF NOT EXISTS "health_checkups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio_age" integer,
	"chrono_age" integer,
	"health_score" integer,
	"systems" jsonb,
	"problems" jsonb,
	"plan" jsonb,
	"summary" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"test_name" text NOT NULL,
	"value" text,
	"unit" text,
	"reference_range" text,
	"status" text DEFAULT 'normal',
	"category" text DEFAULT 'other',
	"lab_name" text,
	"doctor_name" text,
	"tested_at" date,
	"document_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbreak_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" text NOT NULL,
	"disease_category" text NOT NULL,
	"active_cases" integer DEFAULT 0 NOT NULL,
	"recovered" integer DEFAULT 0 NOT NULL,
	"hospitalized" integer DEFAULT 0 NOT NULL,
	"trend" text DEFAULT 'stable' NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symptom_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"city" text NOT NULL,
	"symptom_type" text NOT NULL,
	"temperature" numeric(4, 1),
	"disease_category" text,
	"severity" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"reported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_checkups" ADD CONSTRAINT "health_checkups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symptom_reports" ADD CONSTRAINT "symptom_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checkups_user_idx" ON "health_checkups" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checkups_created_idx" ON "health_checkups" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_results_user_idx" ON "lab_results" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_results_tested_at_idx" ON "lab_results" ("user_id","tested_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbreak_snapshots_city_idx" ON "outbreak_snapshots" ("city");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbreak_snapshots_calc_idx" ON "outbreak_snapshots" ("calculated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_reports_city_idx" ON "symptom_reports" ("city");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_reports_category_idx" ON "symptom_reports" ("disease_category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_reports_reported_at_idx" ON "symptom_reports" ("reported_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_reports_city_date_idx" ON "symptom_reports" ("city","disease_category","reported_at");
