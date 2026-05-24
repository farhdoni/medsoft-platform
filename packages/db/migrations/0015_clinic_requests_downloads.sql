CREATE TABLE IF NOT EXISTS "clinic_demo_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "clinic_name" varchar(200) NOT NULL,
  "contact_name" varchar(100) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "email" varchar(100),
  "doctors_count" varchar(20) NOT NULL,
  "comment" text,
  "locale" varchar(5) DEFAULT 'ru',
  "status" varchar(20) DEFAULT 'new' NOT NULL,
  "ip" varchar(45),
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "download_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "app" varchar(20) NOT NULL,
  "ip" varchar(45),
  "user_agent" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinic_requests_status_idx" ON "clinic_demo_requests" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinic_requests_created_at_idx" ON "clinic_demo_requests" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_logs_app_idx" ON "download_logs" ("app");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_logs_created_at_idx" ON "download_logs" ("created_at");
