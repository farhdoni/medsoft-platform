-- AI Agents: health monitoring alerts + settings
CREATE TABLE IF NOT EXISTS "agent_alerts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "agent_type" VARCHAR(30) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "recommendation" TEXT,
  "related_data" JSONB,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_dismissed" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_alerts_user_created_idx" ON "agent_alerts"("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_alerts_user_type_idx" ON "agent_alerts"("user_id", "agent_type");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "vitals_monitor_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "document_parser_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "medication_tracker_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "weekly_checkup_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "alert_thresholds" JSONB DEFAULT '{}',
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_settings_user_idx" ON "agent_settings"("user_id");
--> statement-breakpoint
-- AI Predictive Medicine
CREATE TABLE IF NOT EXISTS "health_analysis" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "health_score" INTEGER,
  "biological_age" INTEGER,
  "overall_assessment" TEXT,
  "current_problems" JSONB DEFAULT '[]',
  "future_risks" JSONB DEFAULT '[]',
  "health_plan" JSONB,
  "plan_progress" JSONB DEFAULT '{}',
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_analysis_user_created_idx" ON "health_analysis"("user_id", "created_at");
