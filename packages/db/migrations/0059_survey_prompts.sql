-- survey_prompts — Layer 1 survey-engine event log (Слой 1: движок опроса).
-- Append-only: one row per shown/skipped/answered event, not one row per
-- field. Whether a field is actually filled lives in its own table
-- (health_profiles / allergies / chronic_conditions / medications); this
-- table only tracks the shared daily question cap and per-field skip
-- cooldown across both channels (banner today, chat in a later step).
-- Declared in packages/db/src/schema/survey.ts.

CREATE TABLE IF NOT EXISTS "survey_prompts" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "field"       varchar(50) NOT NULL,
  "channel"     varchar(10) NOT NULL,
  "status"      varchar(20) NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_prompts_user_created_idx"
  ON "survey_prompts"("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_prompts_user_field_idx"
  ON "survey_prompts"("user_id", "field");
