-- telegram_link_tokens — one-time tokens behind t.me/aivita_uz_bot?start=<token>,
-- declared in packages/db/src/schema/aivita.ts. Same shape as
-- aivita_password_resets (0003): only the hash is stored, the raw token lives
-- only in the deep link the user is sent.

CREATE TABLE IF NOT EXISTS "telegram_link_tokens" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "token_hash"  text NOT NULL UNIQUE,
  "expires_at"  timestamp NOT NULL,
  "used_at"     timestamp,
  "created_at"  timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_link_tokens_user_idx"
  ON "telegram_link_tokens"("user_id");
