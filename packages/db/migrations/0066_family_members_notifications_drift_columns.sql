-- family_members (15 columns) and notifications (6 columns) — declared in
-- the Drizzle schema, missing from every migration file, same class of
-- drift as 0061/0062. All 21 columns already exist on production with
-- these exact types/nullability/defaults (confirmed read-only 2026-09-18,
-- including weight_kg's numeric(5,2) precision and the card_number unique
-- constraint / migrated_to_user_id FK). No-op on prod; closes the
-- disaster-recovery gap.

ALTER TABLE "family_members"
  ADD COLUMN IF NOT EXISTS "phone" text,
  ADD COLUMN IF NOT EXISTS "notes" text,
  ADD COLUMN IF NOT EXISTS "card_number" text,
  ADD COLUMN IF NOT EXISTS "height_cm" integer,
  ADD COLUMN IF NOT EXISTS "weight_kg" numeric(5, 2),
  ADD COLUMN IF NOT EXISTS "blood_group" text,
  ADD COLUMN IF NOT EXISTS "rh_factor" text,
  ADD COLUMN IF NOT EXISTS "allergies" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "chronic_diseases" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "child_diseases" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "vaccinations" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "medications" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "parent_notes" text,
  ADD COLUMN IF NOT EXISTS "migrated_to_user_id" uuid,
  ADD COLUMN IF NOT EXISTS "migrated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "icon" text,
  ADD COLUMN IF NOT EXISTS "link" text,
  ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'normal' NOT NULL,
  ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_card_number_key" UNIQUE("card_number");
EXCEPTION
 -- A named UNIQUE constraint implicitly creates a backing index of the
 -- same name — if that index already exists (constraint already applied
 -- in an earlier run), Postgres raises duplicate_table (42P07) for the
 -- index, not duplicate_object (42710) for the constraint itself. Confirmed
 -- live: the plain duplicate_object guard used everywhere else in this
 -- migration set does NOT catch this case on a second run.
 WHEN duplicate_object OR duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_migrated_to_user_id_fkey" FOREIGN KEY ("migrated_to_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
