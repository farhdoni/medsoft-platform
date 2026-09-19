-- Landing page tables (packages/db/src/schema/landing.ts) — declared in the
-- Drizzle schema, both tables already exist on production (confirmed
-- read-only 2026-09-18, columns/types/constraints match the schema
-- exactly), live code in apps/api/src/routes/landing-api.ts and
-- aivita-admin-analytics.ts. No migration file ever existed for them — a
-- no-op on prod, closes the disaster-recovery gap.

CREATE TABLE IF NOT EXISTS "landing_config" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "landing_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(200) NOT NULL,
	"phone" varchar(40),
	"locale" varchar(5) DEFAULT 'ru',
	"source" varchar(50) DEFAULT 'landing',
	"user_agent" text,
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landing_waitlist_email_unique" UNIQUE("email")
);
