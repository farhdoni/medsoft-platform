CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "module" VARCHAR(30) NOT NULL,
  "model" VARCHAR(50) NOT NULL,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "cost_usd" NUMERIC(8, 6),
  "response_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_logs_module_idx" ON "ai_usage_logs" ("module");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs" ("created_at");
