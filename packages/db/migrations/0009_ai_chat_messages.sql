-- Create ai_chat_messages table for persistent AI chat history
CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
  "seq"        serial NOT NULL,
  "id"         uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "role"       text NOT NULL,
  "content"    text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_chat_messages_user_seq_idx" ON "ai_chat_messages" ("user_id", "seq");
