-- 0019: Reminder settings & custom reminders

-- ─── reminder_settings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reminder_settings" (
  "id"                    serial PRIMARY KEY,
  "user_id"               uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "settings"              jsonb NOT NULL DEFAULT '{}',
  "quiet_hours_start"     time NOT NULL DEFAULT '23:00',
  "quiet_hours_end"       time NOT NULL DEFAULT '07:00',
  "global_voice_enabled"  boolean NOT NULL DEFAULT true,
  "global_sound_enabled"  boolean NOT NULL DEFAULT true,
  "global_volume"         integer NOT NULL DEFAULT 80,
  "created_at"            timestamp NOT NULL DEFAULT now(),
  "updated_at"            timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "reminder_settings_user_id_key" UNIQUE ("user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_settings_user_idx" ON "reminder_settings"("user_id");

-- ─── custom_reminders ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "custom_reminders" (
  "id"            serial PRIMARY KEY,
  "user_id"       uuid REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "title"         varchar(200) NOT NULL,
  "time"          time NOT NULL,
  "repeat"        varchar(20) NOT NULL DEFAULT 'daily',
  "voice_enabled" boolean NOT NULL DEFAULT false,
  "voice_text"    varchar(300),
  "is_active"     boolean NOT NULL DEFAULT true,
  "created_at"    timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_reminders_user_idx" ON "custom_reminders"("user_id");
