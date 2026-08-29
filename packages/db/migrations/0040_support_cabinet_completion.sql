-- 0040: добивка кабинета поддержки — страховка от мины 0025.
--
-- 0037 создаёт все четыре таблицы через CREATE TABLE IF NOT EXISTS. На нашей
-- базе они создались корректно (проверено: 10 колонок, UNIQUE, CHECK, 3
-- индекса), но ровно так же выглядела и 0025 до того, как на чужой машине
-- messages оказалась старой формы и молча потеряла восемь колонок.
--
-- Здесь нет новых сущностей: ролевые таблицы admin_roles/admin_user_roles уже
-- существуют с 0010, и роль 'support' там уже засеяна — операторский доступ
-- строится на них, а не на новых таблицах.
--
-- Каждый statement идемпотентен по отдельности: раннер в apps/api/src/index.ts
-- ловит ошибку на уровне файла, поэтому первый упавший statement отменяет все
-- последующие в этом же файле.

-- ─── support_tickets ──────────────────────────────────────────────────────
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "status" "support_ticket_status" NOT NULL DEFAULT 'open';
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "assigned_operator_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "first_response_at" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "closed_at" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "rating" smallint;
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "auto_reply_sent_at" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz(3) NOT NULL DEFAULT now();
--> statement-breakpoint

-- UNIQUE на conversation_id держит не только модель «один тикет на диалог»:
-- на него опирается ON CONFLICT в бэкфилле 0037. Без него бэкфилл падает, а
-- вместе с ним — весь хвост файла.
DO $$ BEGIN
  ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_conversation_id_key" UNIQUE ("conversation_id");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "support_tickets"
    ADD CONSTRAINT "support_tickets_rating_range" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "support_tickets_status_operator_idx"
  ON "support_tickets" ("status", "assigned_operator_id");
--> statement-breakpoint

-- ─── support_notes ────────────────────────────────────────────────────────
ALTER TABLE "support_notes" ADD COLUMN IF NOT EXISTS "operator_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "support_notes" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) NOT NULL DEFAULT now();
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_notes_ticket_created_idx"
  ON "support_notes" ("ticket_id", "created_at");
--> statement-breakpoint

-- ─── support_templates ────────────────────────────────────────────────────
ALTER TABLE "support_templates" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "support_templates" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "support_templates" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz(3) NOT NULL DEFAULT now();
--> statement-breakpoint

-- ─── support_audit ────────────────────────────────────────────────────────
ALTER TABLE "support_audit" ADD COLUMN IF NOT EXISTS "operator_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "support_audit" ADD COLUMN IF NOT EXISTS "target_user_id" uuid REFERENCES "aivita_users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "support_audit" ADD COLUMN IF NOT EXISTS "ticket_id" uuid REFERENCES "support_tickets"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "support_audit" ADD COLUMN IF NOT EXISTS "reason" text;
--> statement-breakpoint
ALTER TABLE "support_audit" ADD COLUMN IF NOT EXISTS "old_value" text;
--> statement-breakpoint
ALTER TABLE "support_audit" ADD COLUMN IF NOT EXISTS "new_value" text;
--> statement-breakpoint
ALTER TABLE "support_audit" ADD COLUMN IF NOT EXISTS "created_at" timestamptz(3) NOT NULL DEFAULT now();
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_audit_created_idx"
  ON "support_audit" ("created_at" DESC);
--> statement-breakpoint

-- ─── смена оператора ──────────────────────────────────────────────────────
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "shift_status" varchar(20) NOT NULL DEFAULT 'offline';
--> statement-breakpoint

-- ─── проверка обязательных колонок ────────────────────────────────────────
-- NOT NULL без DEFAULT доложить нельзя, не выдумав данные: text NOT NULL и
-- ключевые ссылки. Если их нет — под знакомым именем лежит чужая таблица, и
-- правильное поведение это громкая ошибка, а не тихая заплатка.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t || '.' || c, ', ' ORDER BY t, c) INTO missing
  FROM (VALUES
    ('support_tickets',   'id'),
    ('support_tickets',   'conversation_id'),
    ('support_notes',     'id'),
    ('support_notes',     'ticket_id'),
    ('support_notes',     'text'),
    ('support_templates', 'id'),
    ('support_templates', 'title'),
    ('support_templates', 'body'),
    ('support_audit',     'id'),
    ('support_audit',     'action')
  ) AS required(t, c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = required.t AND column_name = required.c
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Схема кабинета разошлась с 0037: нет обязательных колонок (%). Их нельзя добавить автоматически — таблица под этим именем создана не миграцией 0037. Разберитесь с ней вручную перед деплоем.',
      missing;
  END IF;
END $$;
