-- 0039: доводит то, что теряется при обрыве 0002.
--
-- 0002_bent_clint_barton.sql не идемпотентна: на строке 270 стоит ALTER TABLE
-- "admin_users" ADD COLUMN "password_hash" text; — без IF NOT EXISTS. При накатывании с нуля колонка к этому моменту уже создана
-- более ранней миграцией, ADD COLUMN падает, и весь остаток файла — 10 колонок,
-- 34 внешних ключа и 28 индексов — не применяется. На проде 0002 когда-то
-- прошла целиком, поэтому там расхождения нет; страдают только базы, поднятые
-- с нуля после того, как ранние миграции стали создавать password_hash сами.
--
-- Саму 0002 не трогаем: она уже применена на проде, и правка применённой
-- миграции — ровно тот класс риска, из-за которого появилась 0038. Вместо
-- этого повторяем её хвост идемпотентно.
--
-- Все десять колонок здесь либо nullable, либо с DEFAULT, поэтому доложить их
-- в таблицу с данными безопасно и случая «нельзя без выдуманных данных» тут
-- нет. Опасность другая: если самой таблицы не существует, сырой ALTER выдаст
-- невнятное "relation does not exist" где-то в середине файла. Поэтому сверху
-- стоит проверка, которая называет все недостающие таблицы разом.
--
-- Внешние ключи и индексы ниже перенесены из 0002 дословно: они уже написаны
-- идемпотентно (DO/EXCEPTION и IF NOT EXISTS) и терялись не из-за своей формы,
-- а из-за того, что до них не доходило исполнение.

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO missing
  FROM unnest(ARRAY['admin_users', 'aivita_appointments', 'aivita_device_tokens', 'aivita_email_verifications', 'aivita_likes', 'aivita_password_resets', 'aivita_prescriptions', 'aivita_referrals', 'aivita_subscriptions', 'aivita_users', 'doctor_notes', 'doctor_notifications', 'doctor_patients', 'doctor_profiles', 'doctor_reviews', 'doctor_schedule', 'landing_content', 'prescription_templates', 'user_devices']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Бутстрап схемы неполон: нет таблиц (%). Их создают миграции до 0002 — значит оборвалась не только 0002. Разберитесь с порядком накатывания перед деплоем.',
      missing;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "nickname" text;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "google_id" text;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'patient' NOT NULL;--> statement-breakpoint
ALTER TABLE "aivita_users" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
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
DO $$ BEGIN
  ALTER TABLE "aivita_users" ADD CONSTRAINT "aivita_users_nickname_unique" UNIQUE("nickname");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "aivita_users" ADD CONSTRAINT "aivita_users_google_id_unique" UNIQUE("google_id");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
