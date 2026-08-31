-- 0043: clinic_demo_requests получает connect_aivita и source.
--
-- start.html всегда собирал оба поля (чекбокс «Подключить AIVITA» и метку
-- источника формы), но demoRequestSchema их не знала — zod молча отбрасывает
-- незнакомые ключи, так что до сих пор они нигде не оседали: ни в БД, ни в
-- Telegram-уведомлении. Теперь оба востребованы кодом эндпоинта.
--
-- Обе колонки безопасны для существующих строк: connect_aivita — boolean с
-- DEFAULT false (старые заявки трактуются как «не отмечали»), source —
-- nullable text без DEFAULT (незачем выдумывать источник для прошлых
-- записей). ADD COLUMN IF NOT EXISTS — идемпотентно на уже применённой базе.

ALTER TABLE "clinic_demo_requests" ADD COLUMN IF NOT EXISTS "connect_aivita" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "clinic_demo_requests" ADD COLUMN IF NOT EXISTS "source" varchar(50);
