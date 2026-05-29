-- 0018: New features — Symptom Checker, Nutrition Logs/Plans, Mental Health

-- ─── symptom_sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "symptom_sessions" (
  "id"            serial PRIMARY KEY,
  "user_id"       uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "session_id"    uuid NOT NULL DEFAULT gen_random_uuid(),
  "main_symptom"  varchar(200) NOT NULL,
  "body_area"     varchar(50),
  "answers"       jsonb NOT NULL DEFAULT '[]',
  "results"       jsonb,
  "created_at"    timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_sessions_user_id_idx" ON "symptom_sessions"("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "symptom_sessions_session_id_idx" ON "symptom_sessions"("session_id");

-- ─── nutrition_logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "nutrition_logs" (
  "id"             serial PRIMARY KEY,
  "user_id"        uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "date"           date NOT NULL,
  "meal"           varchar(20) NOT NULL,
  "dishes"         jsonb NOT NULL DEFAULT '[]',
  "total_calories" integer NOT NULL DEFAULT 0,
  "total_protein"  numeric(6,2) NOT NULL DEFAULT 0,
  "total_fat"      numeric(6,2) NOT NULL DEFAULT 0,
  "total_carbs"    numeric(6,2) NOT NULL DEFAULT 0,
  "created_at"     timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nutrition_logs_user_date_idx" ON "nutrition_logs"("user_id", "date");

-- ─── nutrition_plans ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "nutrition_plans" (
  "id"         serial PRIMARY KEY,
  "user_id"    uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "goal"       varchar(20) NOT NULL,
  "plan"       jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nutrition_plans_user_id_idx" ON "nutrition_plans"("user_id");

-- ─── mood_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mood_logs" (
  "id"         serial PRIMARY KEY,
  "user_id"    uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "mood"       integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
  "factors"    jsonb NOT NULL DEFAULT '[]',
  "note"       text,
  "date"       date NOT NULL DEFAULT CURRENT_DATE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mood_logs_user_date_idx" ON "mood_logs"("user_id", "date");

-- ─── mental_activities ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mental_activities" (
  "id"               serial PRIMARY KEY,
  "user_id"          uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "type"             varchar(20) NOT NULL,
  "exercise_id"      varchar(50),
  "duration_seconds" integer,
  "created_at"       timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mental_activities_user_idx" ON "mental_activities"("user_id");

-- ─── mental_therapist_messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mental_therapist_messages" (
  "id"         serial PRIMARY KEY,
  "user_id"    uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "role"       varchar(10) NOT NULL,
  "content"    text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mental_therapist_user_idx" ON "mental_therapist_messages"("user_id");
