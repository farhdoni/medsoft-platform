-- 0023: medication_reminder_log — персистентный дедуп пушей о лекарствах
--
-- Раньше дедуп жил в памяти процесса (_reminderSentAt): рестарт/деплой внутри
-- окна напоминания давал повторный пуш, а при >1 реплике дубли были бы всегда.
-- Теперь слот (schedule_id, fire_date, time) фиксируется строкой ДО отправки:
-- уникальный констрейнт делает дедуп атомарным между тиками, рестартами и
-- репликами (insert-then-send, семантика at-most-once).
--
-- fire_date — календарная дата слота В ТАЙМЗОНЕ ПОЛЬЗОВАТЕЛЯ (как в job),
-- time — "HH:mm" из medication_schedule.times.
--
-- Миграция аддитивна (CREATE TABLE IF NOT EXISTS) — данные не мутируются.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_reminder_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "schedule_id" uuid NOT NULL REFERENCES "medication_schedule"("id") ON DELETE CASCADE,
  "fire_date" date NOT NULL,
  "time" varchar(5) NOT NULL,
  "sent_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "medication_reminder_log_slot_unique" UNIQUE ("schedule_id", "fire_date", "time")
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_reminder_log_sent_at_idx"
  ON "medication_reminder_log" ("sent_at");
