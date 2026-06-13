-- Health Connect sync state columns on user_devices
-- Nullable, no defaults → safe for existing rows (no table scan, no lock)
ALTER TABLE "user_devices"
  ADD COLUMN IF NOT EXISTS "hc_changes_token" text,
  ADD COLUMN IF NOT EXISTS "hc_last_sync_at" timestamptz;

-- Unique constraint needed for upsert in hc-sync-state endpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_devices_user_type_uniq"
  ON "user_devices" ("user_id", "type");
