-- video_calls — видеозвонки врач-пациент (через встроенный Jitsi Meet iframe,
-- без собственного WebRTC-сигналинга).
--
-- Таблица объявлена в packages/db/src/schema/aivita-doctor.ts и код обеих
-- сторон (apps/api/src/routes/aivita/video-call.ts, фронтенд
-- apps/aivita/components/video/VideoCall.tsx + страницы video-call/[roomId]
-- и doctor-video-call/[roomId]) уже написан и рабочий, но ни разу не
-- мигрирована — POST /v1/aivita/video-call/create падает на "relation
-- video_calls does not exist". Миграция аддитивна (CREATE TABLE IF NOT
-- EXISTS) — данные не мутируются.

CREATE TABLE IF NOT EXISTS "video_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" text NOT NULL UNIQUE,
	"doctor_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE cascade,
	"patient_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE cascade,
	"conversation_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vc_room_idx" ON "video_calls" ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vc_doctor_idx" ON "video_calls" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vc_patient_idx" ON "video_calls" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vc_status_idx" ON "video_calls" ("status");
