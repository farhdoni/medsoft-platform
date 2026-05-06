CREATE TABLE IF NOT EXISTS "aivita_device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"push_token" text NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_device_push_token" UNIQUE("push_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aivita_password_resets_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp,
	"access_token" text,
	"refresh_token" text,
	"metadata" jsonb,
	"connected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"type" text DEFAULT 'offline' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"reason" text,
	"doctor_notes" text,
	"diagnosis" text,
	"next_appointment" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"context" text,
	"appointment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aivita_likes_unique" UNIQUE("from_user_id","to_user_id","type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"frequency" text,
	"duration_days" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"due_date" date,
	"patient_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_doctor_id" uuid NOT NULL,
	"to_doctor_id" uuid,
	"to_specialization" text,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"reason" text,
	"urgency" text DEFAULT 'routine' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aivita_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"role_type" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"payment_method" text,
	"last_payment_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aivita_subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"text" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"related_patient_id" uuid,
	"related_appointment_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_pushed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"access_level" text DEFAULT 'full' NOT NULL,
	"connected_via" text,
	"consultation_count" integer DEFAULT 0 NOT NULL,
	"last_consultation_at" timestamp,
	"notes" text,
	"connected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_patient_unique" UNIQUE("doctor_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"passport_series" text,
	"passport_number" text,
	"passport_issued_by" text,
	"passport_issued_at" date,
	"passport_expires_at" date,
	"phone" text,
	"telegram" text,
	"whatsapp" text,
	"city" text,
	"languages" jsonb DEFAULT '["ru"]'::jsonb,
	"photo_url" text,
	"specialization" text,
	"specialization_code" text,
	"additional_skills" jsonb DEFAULT '[]'::jsonb,
	"diseases_treated" jsonb DEFAULT '[]'::jsonb,
	"experience_start_date" date,
	"consultation_price" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"diploma_university" text,
	"diploma_specialty" text,
	"diploma_year" integer,
	"diploma_number" text,
	"diploma_scan_url" text,
	"diploma_verified" text DEFAULT 'not_uploaded' NOT NULL,
	"certificates" jsonb DEFAULT '[]'::jsonb,
	"license_number" text,
	"license_issued_by" text,
	"license_issued_at" date,
	"license_expires_at" date,
	"license_scan_url" text,
	"license_verified" text DEFAULT 'not_uploaded' NOT NULL,
	"clinic_name" text,
	"clinic_address" text,
	"cabinet_number" text,
	"clinic_phone" text,
	"clinic_website" text,
	"show_in_catalog" boolean DEFAULT false NOT NULL,
	"show_phone" boolean DEFAULT false NOT NULL,
	"show_email" boolean DEFAULT false NOT NULL,
	"show_price" boolean DEFAULT true NOT NULL,
	"show_rating" boolean DEFAULT true NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"total_consultations" integer DEFAULT 0 NOT NULL,
	"total_patients" integer DEFAULT 0 NOT NULL,
	"monthly_consultations" integer DEFAULT 0 NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"thanks_count" integer DEFAULT 0 NOT NULL,
	"recommends_count" integer DEFAULT 0 NOT NULL,
	"verification_status" text DEFAULT 'not_verified' NOT NULL,
	"verified_at" timestamp,
	"verified_by" uuid,
	"rejection_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"rating" integer NOT NULL,
	"text" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_review_unique" UNIQUE("doctor_id","patient_id","appointment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"break_start" text,
	"break_end" text,
	"slot_duration_minutes" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "doctor_schedule_unique_day" UNIQUE("doctor_id","day_of_week")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prescription_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid,
	"is_global" boolean DEFAULT false NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"frequency" text,
	"duration_days" integer,
	"category" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "landing_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"locale" varchar(5) NOT NULL,
	"value" text NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landing_content_unique" UNIQUE("section","key","locale")
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN "role" text DEFAULT 'patient' NOT NULL;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_device_tokens" ADD CONSTRAINT "aivita_device_tokens_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_email_verifications" ADD CONSTRAINT "aivita_email_verifications_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_password_resets" ADD CONSTRAINT "aivita_password_resets_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_appointments" ADD CONSTRAINT "aivita_appointments_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_appointments" ADD CONSTRAINT "aivita_appointments_patient_id_aivita_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_likes" ADD CONSTRAINT "aivita_likes_from_user_id_aivita_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_likes" ADD CONSTRAINT "aivita_likes_to_user_id_aivita_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_likes" ADD CONSTRAINT "aivita_likes_appointment_id_aivita_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."aivita_appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_prescriptions" ADD CONSTRAINT "aivita_prescriptions_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_prescriptions" ADD CONSTRAINT "aivita_prescriptions_patient_id_aivita_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_prescriptions" ADD CONSTRAINT "aivita_prescriptions_appointment_id_aivita_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."aivita_appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_referrals" ADD CONSTRAINT "aivita_referrals_from_doctor_id_aivita_users_id_fk" FOREIGN KEY ("from_doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_referrals" ADD CONSTRAINT "aivita_referrals_to_doctor_id_aivita_users_id_fk" FOREIGN KEY ("to_doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_referrals" ADD CONSTRAINT "aivita_referrals_patient_id_aivita_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_referrals" ADD CONSTRAINT "aivita_referrals_appointment_id_aivita_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."aivita_appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aivita_subscriptions" ADD CONSTRAINT "aivita_subscriptions_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_patient_id_aivita_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_appointment_id_aivita_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."aivita_appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_notifications" ADD CONSTRAINT "doctor_notifications_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_notifications" ADD CONSTRAINT "doctor_notifications_related_patient_id_aivita_users_id_fk" FOREIGN KEY ("related_patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_notifications" ADD CONSTRAINT "doctor_notifications_related_appointment_id_aivita_appointments_id_fk" FOREIGN KEY ("related_appointment_id") REFERENCES "public"."aivita_appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_patients" ADD CONSTRAINT "doctor_patients_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_patients" ADD CONSTRAINT "doctor_patients_patient_id_aivita_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_patient_id_aivita_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_appointment_id_aivita_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."aivita_appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prescription_templates" ADD CONSTRAINT "prescription_templates_doctor_id_aivita_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "landing_content" ADD CONSTRAINT "landing_content_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_tokens_user_idx" ON "aivita_device_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verifications_user_idx" ON "aivita_email_verifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_user_idx" ON "aivita_password_resets" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_user_idx" ON "user_devices" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_user_type_idx" ON "user_devices" ("user_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_appts_doctor_time_idx" ON "aivita_appointments" ("doctor_id","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_appts_patient_idx" ON "aivita_appointments" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_appts_status_idx" ON "aivita_appointments" ("doctor_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_likes_to_user_idx" ON "aivita_likes" ("to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_doctor_idx" ON "aivita_prescriptions" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_patient_idx" ON "aivita_prescriptions" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescriptions_status_idx" ON "aivita_prescriptions" ("patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referrals_from_doctor_idx" ON "aivita_referrals" ("from_doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referrals_to_doctor_idx" ON "aivita_referrals" ("to_doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referrals_patient_idx" ON "aivita_referrals" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_subscriptions_user_idx" ON "aivita_subscriptions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aivita_subscriptions_active_idx" ON "aivita_subscriptions" ("is_active","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_notes_dp_idx" ON "doctor_notes" ("doctor_id","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_notifs_doctor_idx" ON "doctor_notifications" ("doctor_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_notifs_unread_idx" ON "doctor_notifications" ("doctor_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_patients_doctor_idx" ON "doctor_patients" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_patients_patient_idx" ON "doctor_patients" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_profiles_user_idx" ON "doctor_profiles" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_profiles_catalog_idx" ON "doctor_profiles" ("show_in_catalog","specialization");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_reviews_doctor_idx" ON "doctor_reviews" ("doctor_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_schedule_doctor_idx" ON "doctor_schedule" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescription_templates_doctor_idx" ON "prescription_templates" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescription_templates_global_idx" ON "prescription_templates" ("is_global","category");--> statement-breakpoint
ALTER TABLE "aivita_users" ADD CONSTRAINT "aivita_users_nickname_unique" UNIQUE("nickname");--> statement-breakpoint
ALTER TABLE "aivita_users" ADD CONSTRAINT "aivita_users_google_id_unique" UNIQUE("google_id");