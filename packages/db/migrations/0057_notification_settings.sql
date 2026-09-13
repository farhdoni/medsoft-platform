-- notification_settings — таблица объявлена в packages/db/src/schema/aivita.ts
-- и читается/пишется apps/api/src/routes/aivita/notifications.ts (GET/PUT
-- /v1/aivita/notifications/settings), но ни разу не была мигрирована в этом
-- репозитории — ни один файл в packages/db/migrations её не создаёт.
--
-- Проверено на проде (2026-09-13, read-only): таблица там ФАКТИЧЕСКИ уже
-- существует и создана в обход миграций (drizzle-kit push / ручной SQL) —
-- совпадает со схемой по всем 7 «нашим» колонкам, но несёт 2 колонки, которых
-- в schema.ts больше нет (push_enabled, health_alerts — мёртвый след старого
-- мобильного экрана настроек, см. archived/aivita-mobile). CREATE TABLE ниже
-- поэтому на проде — чистый no-op (IF NOT EXISTS), а закрывает дырку только
-- для остальных окружений (dev/staging/чистый прод-редеплой), где таблицы
-- ещё нет.
--
-- Настоящая цель этой миграции — unique-индекс на telegram_chat_id: сейчас
-- на проде его нет (только сам столбец), а для Telegram-канала обязателен
-- принцип «один Telegram-аккаунт = один пользователь». NULL-значения (все
-- строки до подключения Telegram) уникальности не мешают — Postgres не
-- считает NULL равным NULL в unique-индексе.

CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE cascade,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"telegram_enabled" boolean DEFAULT false NOT NULL,
	"telegram_chat_id" text,
	"medication_reminders" boolean DEFAULT true NOT NULL,
	"appointment_reminders" boolean DEFAULT true NOT NULL,
	"outbreak_alerts" boolean DEFAULT true NOT NULL,
	"marketing_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_settings_user_idx" ON "notification_settings" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_settings_telegram_chat_id_unique" ON "notification_settings" ("telegram_chat_id");
