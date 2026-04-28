DO $$ BEGIN
 CREATE TYPE "public"."admin_role" AS ENUM('superadmin', 'admin', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."clinic_status" AS ENUM('pending', 'active', 'suspended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."clinic_type" AS ENUM('hospital', 'clinic', 'laboratory', 'pharmacy', 'diagnostic_center');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."blood_group" AS ENUM('O_minus', 'O_plus', 'A_minus', 'A_plus', 'B_minus', 'B_plus', 'AB_minus', 'AB_plus', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."patient_status" AS ENUM('pending_verification', 'active', 'suspended', 'premium');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."doctor_status" AS ENUM('pending', 'active', 'suspended', 'offline');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ai_intent" AS ENUM('symptom_check', 'doctor_recommendation', 'medication_info', 'lifestyle_advice', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ai_outcome" AS ENUM('appointment_booked', 'self_care_advised', 'sos_triggered', 'no_action', 'abandoned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_provider" AS ENUM('click', 'payme', 'uzcard', 'humo', 'internal_deposit', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transaction_type" AS ENUM('deposit_topup', 'appointment_payment', 'refund', 'withdrawal', 'commission_to_clinic', 'bonus');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled_by_patient', 'cancelled_by_doctor', 'no_show');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."appointment_type" AS ENUM('telemedicine_video', 'telemedicine_chat', 'offline_clinic', 'home_visit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sos_status" AS ENUM('triggered', 'operator_assigned', 'brigade_dispatched', 'in_progress', 'resolved', 'false_alarm', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"totp_secret" text,
	"totp_activated_at" timestamp with time zone,
	"backup_codes_hash" text[],
	"backup_codes_used_count" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp with time zone,
	"last_login_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "clinic_type" DEFAULT 'clinic' NOT NULL,
	"status" "clinic_status" DEFAULT 'pending' NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"location_lat" numeric(10, 7),
	"location_lng" numeric(10, 7),
	"phone" text NOT NULL,
	"email" text,
	"website" text,
	"contract_number" text,
	"contract_signed_at" timestamp with time zone,
	"commission_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"doctors_count" integer DEFAULT 0 NOT NULL,
	"appointments_this_month" integer DEFAULT 0 NOT NULL,
	"revenue_this_month_uzs" numeric(14, 2) DEFAULT '0' NOT NULL,
	"logo_url" text,
	"description" text,
	"working_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"full_name" text NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"passport_number" text,
	"pinfl" text,
	"status" "patient_status" DEFAULT 'pending_verification' NOT NULL,
	"blood_group" "blood_group" DEFAULT 'unknown',
	"allergies" text[],
	"chronic_conditions" text[],
	"current_medications" text[],
	"guardian_patient_id" uuid,
	"is_minor" boolean DEFAULT false NOT NULL,
	"deposit_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deposit_currency" text DEFAULT 'UZS' NOT NULL,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"preferred_language" text DEFAULT 'uz' NOT NULL,
	"anamnesis_vitae_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "patients_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"specialization" text NOT NULL,
	"secondary_specializations" text[],
	"license_number" text NOT NULL,
	"years_of_experience" integer DEFAULT 0 NOT NULL,
	"clinic_id" uuid,
	"consultation_price_uzs" numeric(10, 2) DEFAULT '0' NOT NULL,
	"accepts_telemedicine" boolean DEFAULT true NOT NULL,
	"accepts_offline" boolean DEFAULT true NOT NULL,
	"status" "doctor_status" DEFAULT 'pending' NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0',
	"rating_count" integer DEFAULT 0 NOT NULL,
	"appointments_count" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"photo_url" text,
	"education" text[],
	"certifications" text[],
	"languages" text[] DEFAULT '{uz,ru}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "doctors_phone_unique" UNIQUE("phone"),
	CONSTRAINT "doctors_email_unique" UNIQUE("email"),
	CONSTRAINT "doctors_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"session_id" uuid NOT NULL,
	"intent" "ai_intent",
	"outcome" "ai_outcome",
	"role" text NOT NULL,
	"content" text NOT NULL,
	"content_tokens" integer,
	"recommended_doctor_id" uuid,
	"recommended_specialization" text,
	"confidence_score" numeric(3, 2),
	"model_name" text,
	"model_latency_ms" integer,
	"resulting_appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"appointment_id" uuid,
	"clinic_id" uuid,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"amount_uzs" numeric(14, 2) NOT NULL,
	"direction" text NOT NULL,
	"provider_transaction_id" text,
	"provider_response" text,
	"description" text,
	"initiated_by_admin_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid,
	"type" "appointment_type" NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"price_uzs" numeric(10, 2) NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"transaction_id" uuid,
	"patient_complaint" text,
	"doctor_notes" text,
	"diagnosis" text,
	"prescription" text,
	"video_room_url" text,
	"video_started_at" timestamp with time zone,
	"video_ended_at" timestamp with time zone,
	"ai_log_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sos_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" "sos_status" DEFAULT 'triggered' NOT NULL,
	"location_lat" numeric(10, 7) NOT NULL,
	"location_lng" numeric(10, 7) NOT NULL,
	"location_accuracy_meters" integer,
	"address_resolved" text,
	"ehr_snapshot" jsonb NOT NULL,
	"assigned_admin_id" uuid,
	"assigned_at" timestamp with time zone,
	"brigade_dispatched_at" timestamp with time zone,
	"brigade_arrived_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"patient_notes" text,
	"operator_notes" text,
	"resolution_summary" text,
	"triggered_from" text DEFAULT 'mobile_app' NOT NULL,
	"device_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_admin_id" uuid NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctors" ADD CONSTRAINT "doctors_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_recommended_doctor_id_doctors_id_fk" FOREIGN KEY ("recommended_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_initiated_by_admin_id_admin_users_id_fk" FOREIGN KEY ("initiated_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_ai_log_id_ai_logs_id_fk" FOREIGN KEY ("ai_log_id") REFERENCES "public"."ai_logs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sos_calls" ADD CONSTRAINT "sos_calls_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sos_calls" ADD CONSTRAINT "sos_calls_assigned_admin_id_admin_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_admin_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
