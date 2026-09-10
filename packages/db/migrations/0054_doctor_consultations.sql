-- doctor_consultations — врачебный ИИ-скрайб (SOAP-протокол приёма).
--
-- Таблица объявлена в packages/db/src/schema/aivita-doctor.ts и код обеих
-- сторон (apps/api/src/routes/aivita/doctor/scribe.ts, фронтенд
-- apps/aivita/app/[locale]/(doctor)/doctor-scribe/page.tsx) уже написан и
-- рабочий, но ни разу не мигрирована — POST /v1/aivita/doctor/scribe/save
-- падает на "relation doctor_consultations does not exist". Миграция
-- аддитивна (CREATE TABLE IF NOT EXISTS) — данные не мутируются.

CREATE TABLE IF NOT EXISTS "doctor_consultations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE cascade,
	"patient_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE cascade,
	"transcript" text,
	"protocol" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consult_doctor_idx" ON "doctor_consultations" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consult_patient_idx" ON "doctor_consultations" ("patient_id");
