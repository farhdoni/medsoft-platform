-- 0025: AV Chat Open Messenger Schema & Drop Legacy Doctor-Patient Chat
-- ─── 1. Enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'group', 'channel');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."conversation_status" AS ENUM('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."message_type" AS ENUM('text', 'voice', 'file', 'image', 'location');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."message_report_status" AS ENUM('pending', 'reviewed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ─── 2. Drop Legacy Tables ───────────────────────────────────────────────────

DROP TABLE IF EXISTS "doctor_messages" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "doctor_conversations" CASCADE;
--> statement-breakpoint

-- ─── 3. Create AV Chat Tables ─────────────────────────────────────────────────

-- conversations
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "conversation_type" DEFAULT 'direct' NOT NULL,
  "status" "conversation_status" DEFAULT 'active' NOT NULL,
  "last_message_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- conversation_participants
CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "last_read_at" timestamptz,
  "joined_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "conv_participants_conv_user_unique" UNIQUE("conversation_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conv_participants_conv_idx" ON "conversation_participants" ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conv_participants_user_idx" ON "conversation_participants" ("user_id");
--> statement-breakpoint

-- messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "type" "message_type" DEFAULT 'text' NOT NULL,
  "content" text,
  "attachment_url" text,
  "attachment_name" text,
  "attachment_mime" text,
  "attachment_size" integer,
  "reply_to_id" uuid REFERENCES "messages"("id") ON DELETE SET NULL,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conv_created_idx" ON "messages" ("conversation_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_idx" ON "messages" ("sender_id");
--> statement-breakpoint

-- user_blocks
CREATE TABLE IF NOT EXISTS "user_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blocker_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "blocked_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "user_blocks_blocker_blocked_unique" UNIQUE("blocker_id", "blocked_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx" ON "user_blocks" ("blocker_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "user_blocks" ("blocked_id");
--> statement-breakpoint

-- message_reports
CREATE TABLE IF NOT EXISTS "message_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "reporter_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "status" "message_report_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reports_message_idx" ON "message_reports" ("message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reports_reporter_idx" ON "message_reports" ("reporter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reports_status_idx" ON "message_reports" ("status");
--> statement-breakpoint

-- message_reactions
CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "emoji" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "message_reactions_message_user_unique" UNIQUE("message_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reactions_message_idx" ON "message_reactions" ("message_id");
