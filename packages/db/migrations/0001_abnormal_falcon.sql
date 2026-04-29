CREATE TABLE IF NOT EXISTS "aivita_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"name" text,
	"avatar_url" text,
	"provider" text NOT NULL,
	"provider_user_id" text,
	"locale" text DEFAULT 'ru' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"email_verified" timestamp,
	"phone_verified" timestamp,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "aivita_users_email_unique" UNIQUE("email"),
	CONSTRAINT "aivita_users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"allergen" text NOT NULL,
	"type" text NOT NULL,
	"severity" text,
	"reaction" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"ai_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chronic_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icd10_code" text,
	"diagnosed_year" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"report_number" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size_bytes" integer,
	"snapshot_data" jsonb NOT NULL,
	"share_token" text,
	"share_token_expires_at" timestamp,
	"viewed_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "doctor_reports_report_number_unique" UNIQUE("report_number"),
	CONSTRAINT "doctor_reports_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"member_user_id" uuid,
	"member_name" text NOT NULL,
	"member_relation" text NOT NULL,
	"member_birth_date" date,
	"member_gender" text,
	"permission_level" text DEFAULT 'view' NOT NULL,
	"invite_status" text DEFAULT 'accepted' NOT NULL,
	"invite_token" text,
	"invite_phone" text,
	"invite_email" text,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "family_members_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"value" numeric(10, 2),
	"unit" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"category" text,
	"goal_type" text NOT NULL,
	"goal_value" numeric(10, 2),
	"goal_unit" text,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"reminder_time" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"birth_date" date,
	"gender" text,
	"blood_type" text,
	"height_cm" integer,
	"weight_kg" numeric(5, 2),
	"pinfl" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"smoking_status" text,
	"alcohol_frequency" text,
	"exercise_frequency" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "health_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_score" integer NOT NULL,
	"cardiovascular_score" integer,
	"digestive_score" integer,
	"sleep_score" integer,
	"mental_score" integer,
	"musculoskeletal_score" integer,
	"health_age" integer,
	"growth_zone" text,
	"trigger" text NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"meal_type" text NOT NULL,
	"date" date NOT NULL,
	"consumed_at" timestamp NOT NULL,
	"portion_grams" integer,
	"calories" numeric(6, 1) NOT NULL,
	"protein_g" numeric(5, 1),
	"fat_g" numeric(5, 1),
	"carbs_g" numeric(5, 1),
	"source" text DEFAULT 'manual' NOT NULL,
	"ai_confidence" integer,
	"photo_url" text,
	"ai_metadata" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dosage" text,
	"frequency" text,
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb,
	"read_at" timestamp,
	"push_sent" boolean DEFAULT false NOT NULL,
	"push_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_month" text NOT NULL,
	"system" text NOT NULL,
	"score" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"growth_zones" jsonb,
	"positives" jsonb,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_period_system" UNIQUE("user_id","period_month","system")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" jsonb NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "allergies" ADD CONSTRAINT "allergies_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chronic_conditions" ADD CONSTRAINT "chronic_conditions_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_reports" ADD CONSTRAINT "doctor_reports_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_owner_id_aivita_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_member_user_id_aivita_users_id_fk" FOREIGN KEY ("member_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_scores" ADD CONSTRAINT "health_scores_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_test_results" ADD CONSTRAINT "system_test_results_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vitals" ADD CONSTRAINT "vitals_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_users_email_idx" ON "aivita_users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_users_phone_idx" ON "aivita_users" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_users_provider_idx" ON "aivita_users" ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "allergies_user_idx" ON "allergies" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_session_idx" ON "chat_messages" ("session_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_sessions_user_idx" ON "chat_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chronic_conditions_user_idx" ON "chronic_conditions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_reports_user_idx" ON "doctor_reports" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_reports_share_token_idx" ON "doctor_reports" ("share_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_owner_idx" ON "family_members" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_member_idx" ON "family_members" ("member_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_invite_token_idx" ON "family_members" ("invite_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_logs_habit_date_idx" ON "habit_logs" ("habit_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_logs_user_date_idx" ON "habit_logs" ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_user_idx" ON "habits" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_active_idx" ON "habits" ("user_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_profiles_user_idx" ON "health_profiles" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_scores_user_time_idx" ON "health_scores" ("user_id","calculated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meals_user_date_idx" ON "meals" ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meals_type_idx" ON "meals" ("user_id","date","meal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_history_user_idx" ON "medical_history" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_history_start_date_idx" ON "medical_history" ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medications_user_idx" ON "medications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medications_active_idx" ON "medications" ("user_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("user_id","read_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_test_user_period_idx" ON "system_test_results" ("user_id","period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vitals_user_time_idx" ON "vitals" ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vitals_type_idx" ON "vitals" ("user_id","type","recorded_at");