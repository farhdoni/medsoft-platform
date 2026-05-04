CREATE TABLE IF NOT EXISTS "aivita_device_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "push_token" text NOT NULL,
  "platform" text NOT NULL DEFAULT 'android',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "unique_device_push_token" UNIQUE("push_token")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_tokens_user_idx" ON "aivita_device_tokens" ("user_id");
