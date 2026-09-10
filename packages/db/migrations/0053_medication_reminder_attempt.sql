-- 0053: medication_reminder_log.attempt — персистентный счётчик повторов
--
-- До этой миграции количество уже отправленных повторов о конкретном приёме
-- лекарства (1-й / +15мин / +30мин) жило в in-memory Map внутри
-- apps/api/src/jobs/medication-reminders.ts (pendingReminders). Рестарт/деплой
-- API посреди цикла напоминаний терял прогресс: пациенту могли напомнить
-- заново с 1-й попытки либо, наоборот, ни разу не проставить 'missed'.
--
-- attempt хранится в УЖЕ существующей medication_reminder_log (0023) — это та
-- же строка на слот (schedule_id, fire_date, time), которая раньше означала
-- «слот отправлен, не слать больше», а теперь означает «на слоте отправлено
-- attempt попыток». Job делает claim следующей попытки через
-- UPDATE ... WHERE attempt = <текущий> (или INSERT ON CONFLICT DO NOTHING для
-- первой) — та же at-most-once семантика, что и раньше, только с прогрессией
-- 1 → 2 → 3 вместо одноразовой отметки.
--
-- Миграция аддитивна (ADD COLUMN IF NOT EXISTS + DEFAULT) — существующие
-- строки (все — единственная когда-то отправленная попытка) получают attempt=1,
-- что корректно описывает их историю.

--> statement-breakpoint
ALTER TABLE "medication_reminder_log"
  ADD COLUMN IF NOT EXISTS "attempt" integer NOT NULL DEFAULT 1;
