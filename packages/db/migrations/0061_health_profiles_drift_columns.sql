-- health_profiles — backfill 8 columns into the migration history that were
-- declared in the Drizzle schema (packages/db/src/schema/aivita.ts) but
-- never had a migration file (docs/llm-layer-audit.md-adjacent drift, found
-- while building the Layer-1 survey engine). Confirmed read-only against
-- production before writing this: all 8 already exist there with these
-- exact types/nullability (someone ran drizzle-kit push directly against
-- prod at some point) — so on prod this migration is a documented no-op;
-- its purpose is disaster recovery (rebuilding the schema from migrations
-- alone would otherwise silently miss these 8 columns).
--
-- None of these had a Drizzle .default(...) — plain nullable columns, no
-- DEFAULT clause here either, to match exactly.

ALTER TABLE "health_profiles"
  ADD COLUMN IF NOT EXISTS "sleep_hours_per_night" text,
  ADD COLUMN IF NOT EXISTS "nutrition_type" text,
  ADD COLUMN IF NOT EXISTS "school" text,
  ADD COLUMN IF NOT EXISTS "grade" text,
  ADD COLUMN IF NOT EXISTS "vision_status" text,
  ADD COLUMN IF NOT EXISTS "child_diseases" jsonb,
  ADD COLUMN IF NOT EXISTS "vaccination_history" jsonb,
  ADD COLUMN IF NOT EXISTS "screen_time" text;
