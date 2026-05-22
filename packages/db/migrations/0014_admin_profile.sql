ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "locale" varchar(5) DEFAULT 'ru' NOT NULL;
