-- 0020: Dedup vitals + unique constraint for upsert
--
-- Strategy: daily-aggregate types (steps, sleep_hours, water_ml) are stored
-- one row per day. The API normalizes their recorded_at to midnight UTC before
-- insert, so a single UNIQUE(user_id, type, recorded_at) covers both:
--   - daily types  → deduped at day granularity (all share 00:00:00 UTC)
--   - sample types → deduped at exact timestamp (heart_rate, spo2, …)

-- Step 1: Remove duplicates for daily-aggregate types.
-- Keep the row with the latest recorded_at per (user_id, type, day).
-- Existing prod data has two steps rows for the same day (17:59 and 18:43);
-- this deletes the older one before we normalize timestamps.
--> statement-breakpoint
DELETE FROM vitals
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, type, DATE(recorded_at)
        ORDER BY recorded_at DESC, created_at DESC
      ) AS rn
    FROM vitals
    WHERE type IN ('steps', 'sleep_hours', 'water_ml')
  ) ranked
  WHERE rn > 1
);

-- Step 2: Normalize recorded_at for daily-aggregate types to midnight UTC.
-- After this, all same-day rows for a given user+type share the same key.
--> statement-breakpoint
UPDATE vitals
SET recorded_at = DATE_TRUNC('day', recorded_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
WHERE type IN ('steps', 'sleep_hours', 'water_ml');

-- Step 3: Add the unique index. Used by the API's onConflictDoUpdate.
--> statement-breakpoint
CREATE UNIQUE INDEX "vitals_user_type_recorded_at_uniq"
  ON vitals (user_id, type, recorded_at);
