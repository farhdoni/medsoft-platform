-- ai_usage_logs — add prompt-cache token columns and a UUID column for
-- AIVITA patient attribution (Слой AI-чат: usage-логирование + кэш промпта).
--
-- Why a NEW column instead of reusing user_id: user_id is `integer` with
-- no FK (packages/db/migrations/0011_ai_usage_logs.sql) — it was scaffolded
-- for a different, integer-keyed identifier space, never actually wired to
-- any table. AIVITA patients (aivita_users.id) are uuid. Since nothing in
-- the codebase has ever written to this table (see docs/llm-layer-audit.md
-- §6), there is no existing behavior around user_id to preserve — adding a
-- second, correctly-typed column is simpler and safer than overloading a
-- column whose type doesn't fit. No FK here either, matching user_id's own
-- existing FK-less style for this log table.

ALTER TABLE "ai_usage_logs"
  ADD COLUMN IF NOT EXISTS "cache_creation_input_tokens" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cache_read_input_tokens" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "aivita_user_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_logs_aivita_user_idx" ON "ai_usage_logs" ("aivita_user_id");
