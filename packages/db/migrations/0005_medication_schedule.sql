-- Create medication_schedule table
CREATE TABLE IF NOT EXISTS "medication_schedule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "prescription_id" uuid REFERENCES "aivita_prescriptions"("id") ON DELETE SET NULL,
  "title" varchar(200) NOT NULL,
  "dosage" varchar(100),
  "frequency" varchar(50) NOT NULL DEFAULT '1 раз в день',
  "times" jsonb NOT NULL DEFAULT '[]',
  "duration_days" integer,
  "start_date" date NOT NULL,
  "end_date" date,
  "instructions" text,
  "reminder_enabled" boolean NOT NULL DEFAULT true,
  "reminder_minutes_before" integer NOT NULL DEFAULT 5,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" varchar(20) NOT NULL DEFAULT 'patient',
  "doctor_id" uuid REFERENCES "aivita_users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_schedule_user_idx" ON "medication_schedule" ("user_id", "is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_schedule_prescription_idx" ON "medication_schedule" ("prescription_id");
--> statement-breakpoint

-- Create medication_log table
CREATE TABLE IF NOT EXISTS "medication_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid NOT NULL REFERENCES "medication_schedule"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "scheduled_at" timestamp NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "taken_at" timestamp,
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_log_user_idx" ON "medication_log" ("user_id", "scheduled_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_log_schedule_idx" ON "medication_log" ("schedule_id", "scheduled_at");
