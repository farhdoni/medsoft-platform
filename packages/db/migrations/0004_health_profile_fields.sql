-- Add missing columns to health_profiles
-- Using IF NOT EXISTS so it's safe even if some were already added via SSH

ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "city" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "telegram" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "whatsapp" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "diet_type" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "sleep_schedule" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "stress_level" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "passport_issued_by" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "passport_issued_date" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "passport_expires" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "emergency_contact_relation" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "doctor_name" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "doctor_phone" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "clinic" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "insurance_company" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "insurance_number" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "insurance_expires" text;
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "insurance_hotline" text;
