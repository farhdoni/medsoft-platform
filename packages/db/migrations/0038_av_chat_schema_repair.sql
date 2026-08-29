-- 0038: доводит схему AV Chat до того, что объявляет 0025.
--
-- Мина в 0025: все шесть таблиц там создаются через CREATE TABLE IF NOT EXISTS
-- и ни одна не сопровождается ALTER-ами. Если таблица с таким именем на базе
-- уже была — в любой более ранней форме (ручной push из schema.ts, прошлая
-- редакция той же миграции, остатки предыдущей фичи) — CREATE молча ничего не
-- делает, и КАЖДАЯ колонка, объявленная в 0025, может отсутствовать. Ошибки
-- при этом нет: 0025 отрабатывает «успешно», а расходится схема.
--
-- Ровно так и вышло: на рабочей машине messages существовала без reply_to_id,
-- seed-av-chat.ts падал на INSERT, и колонку добавляли руками. Эта миграция
-- делает то же самое воспроизводимо и заодно закрывает остальные пять таблиц.
--
-- Разделение на две части ниже намеренное:
--
--   Часть 1 — колонки, которые можно доложить безопасно: nullable или с
--   DEFAULT. ADD COLUMN IF NOT EXISTS на живой таблице с данными для них
--   корректен, а на правильной базе это no-op.
--
--   Часть 2 — обязательные колонки идентичности (первичные ключи, NOT NULL
--   внешние ключи, reason и emoji без DEFAULT). Их нельзя доложить в таблицу
--   с существующими строками, не выдумав данные. Если такой колонки нет, это
--   не дрейф, а другая таблица под тем же именем — и тогда правильное
--   поведение это громкая ошибка, а не тихая заплатка. Поэтому в конце стоит
--   проверка, которая падает с внятным текстом вместо того, чтобы пропустить
--   сломанную схему в прод.

-- ─── Часть 1. Безопасные колонки ──────────────────────────────────────────────

-- conversations
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "type" "conversation_type" DEFAULT 'direct' NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "status" "conversation_status" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "last_message_at" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) DEFAULT now() NOT NULL;
--> statement-breakpoint

-- conversation_participants
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "last_read_at" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "joined_at" timestamptz(3) DEFAULT now() NOT NULL;
--> statement-breakpoint

-- messages — здесь и жила пропавшая reply_to_id
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "type" "message_type" DEFAULT 'text' NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "content" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_url" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_name" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_mime" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_size" integer;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "reply_to_id" uuid REFERENCES "messages"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) DEFAULT now() NOT NULL;
--> statement-breakpoint

-- user_blocks
ALTER TABLE "user_blocks" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) DEFAULT now() NOT NULL;
--> statement-breakpoint

-- message_reports
ALTER TABLE "message_reports" ADD COLUMN IF NOT EXISTS "status" "message_report_status" DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "message_reports" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "message_reports" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "message_reports" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) DEFAULT now() NOT NULL;
--> statement-breakpoint

-- message_reactions
ALTER TABLE "message_reactions" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) DEFAULT now() NOT NULL;
--> statement-breakpoint

-- ─── Часть 2. Индексы и уникальные ограничения ────────────────────────────────
-- Их 0025 объявляет внутри CREATE TABLE либо отдельными CREATE INDEX, и по той
-- же причине они могли не появиться. CREATE INDEX IF NOT EXISTS идемпотентен
-- сам по себе; ограничения приходится заворачивать в DO, у них нет IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS "conv_participants_conv_idx" ON "conversation_participants" ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conv_participants_user_idx" ON "conversation_participants" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conv_created_idx" ON "messages" ("conversation_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_idx" ON "messages" ("sender_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx" ON "user_blocks" ("blocker_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "user_blocks" ("blocked_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reports_message_idx" ON "message_reports" ("message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reports_reporter_idx" ON "message_reports" ("reporter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reports_status_idx" ON "message_reports" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reactions_message_idx" ON "message_reactions" ("message_id");
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "conversation_participants"
    ADD CONSTRAINT "conv_participants_conv_user_unique" UNIQUE ("conversation_id", "user_id");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_blocked_unique" UNIQUE ("blocker_id", "blocked_id");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "message_reactions"
    ADD CONSTRAINT "message_reactions_message_user_unique" UNIQUE ("message_id", "user_id");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ─── Часть 3. Проверка обязательных колонок ───────────────────────────────────
-- Доложить их нельзя (NOT NULL без DEFAULT), поэтому их отсутствие означает,
-- что под знакомым именем лежит чужая таблица. Падаем явно.

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t || '.' || c, ', ' ORDER BY t, c) INTO missing
  FROM (VALUES
    ('conversations', 'id'),
    ('conversation_participants', 'id'),
    ('conversation_participants', 'conversation_id'),
    ('conversation_participants', 'user_id'),
    ('messages', 'id'),
    ('messages', 'conversation_id'),
    ('messages', 'sender_id'),
    ('user_blocks', 'id'),
    ('user_blocks', 'blocker_id'),
    ('user_blocks', 'blocked_id'),
    ('message_reports', 'id'),
    ('message_reports', 'message_id'),
    ('message_reports', 'reporter_id'),
    ('message_reports', 'reason'),
    ('message_reactions', 'id'),
    ('message_reactions', 'message_id'),
    ('message_reactions', 'user_id'),
    ('message_reactions', 'emoji')
  ) AS required(t, c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = required.t AND column_name = required.c
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Схема AV Chat разошлась с 0025: нет обязательных колонок (%). Их нельзя добавить автоматически — таблица под этим именем создана не миграцией 0025. Разберитесь с ней вручную перед деплоем.',
      missing;
  END IF;
END $$;
