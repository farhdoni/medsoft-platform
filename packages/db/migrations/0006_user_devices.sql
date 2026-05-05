CREATE TABLE IF NOT EXISTS "user_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "last_sync_at" timestamp,
  "access_token" text,
  "refresh_token" text,
  "metadata" jsonb,
  "connected_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_user_idx" ON "user_devices" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_user_type_idx" ON "user_devices" ("user_id", "type");
