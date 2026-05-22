CREATE TABLE IF NOT EXISTS "system_backups" (
  "id" serial PRIMARY KEY NOT NULL,
  "filename" varchar(200) NOT NULL,
  "size_bytes" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_backups_created_at_idx" ON "system_backups" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "level" varchar(10) NOT NULL,
  "module" varchar(30) NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_level_idx" ON "system_logs" ("level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_module_idx" ON "system_logs" ("module");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_logs_created_at_idx" ON "system_logs" ("created_at");
