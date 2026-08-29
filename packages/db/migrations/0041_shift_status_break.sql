-- 0041: третье состояние смены — break.
--
-- 0037 завела shift_status как varchar(20) именно с расчётом, что значения
-- добавятся: расширить varchar дешевле, чем возиться с ALTER TYPE на enum.
-- Этот случай и наступил — макет кабинета показывает три позиции.
--
-- Разница между offline и break не косметическая, она меняет поведение:
-- автоответ «вне часов» уходит, когда никого нет (offline), и НЕ уходит,
-- когда оператор на перерыве и вернётся сам.
--
-- CHECK, а не enum: тот же довод, что и в 0037, плюс ограничение снимается
-- одной строкой, если появится четвёртое состояние.

-- Нормализация ИДЁТ ПЕРВОЙ: значение вне набора могло появиться только
-- руками, и на такой базе ALTER ниже упал бы check_violation — а он не
-- duplicate_object, поэтому EXCEPTION его не поймает и оборвёт весь файл.
UPDATE "admin_users" SET "shift_status" = 'offline'
WHERE "shift_status" NOT IN ('offline', 'online', 'break');
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "admin_users"
    ADD CONSTRAINT "admin_users_shift_status_check"
    CHECK ("shift_status" IN ('offline', 'online', 'break'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
