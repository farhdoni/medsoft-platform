-- 0017: Medications redesign — new columns for 14-feature UI

-- ─── medication_schedule: extended fields ───────────────────────────────────
ALTER TABLE "medication_schedule"
  ADD COLUMN IF NOT EXISTS "side_effects"        jsonb         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "contraindications"   jsonb         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "food_instruction"    varchar(50),
  ADD COLUMN IF NOT EXISTS "remaining_pills"     integer,
  ADD COLUMN IF NOT EXISTS "persistent_reminder" boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "source"              varchar(20)   NOT NULL DEFAULT 'manual';
-- source: 'manual' | 'receipt_ocr' | 'doctor' | 'chat'

-- ─── aivita_users: streak & gamification fields ─────────────────────────────
ALTER TABLE "aivita_users"
  ADD COLUMN IF NOT EXISTS "current_streak"  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "longest_streak"  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "streak_badges"   jsonb   NOT NULL DEFAULT '[]';
-- streak_badges: [{id, name, icon, earnedAt}]
