-- 0037: кабинет поддержки и модерации AIVITA.
--
-- Тикет — это НАДСТРОЙКА над диалогом, а не его копия. Переписка оператора с
-- пользователем остаётся обычным диалогом в conversations/messages: она видна
-- пользователю в мессенджере и ходит по тому же пуш-пути. support_tickets
-- добавляет к ней только то, чего у диалога нет и не должно быть — статус,
-- назначенного оператора, отметки SLA и оценку. Отсюда 1:1 и UNIQUE на
-- conversation_id: два тикета на один диалог означали бы две очереди на одну
-- переписку.
--
-- ON DELETE CASCADE от conversations: диалога нет — тикету не на что
-- ссылаться. А вот assigned_operator_id — SET NULL: уволенный оператор не
-- должен уносить с собой тикет, тикет просто возвращается в нераспределённые.
--
-- timestamptz(3) везде, как во всех таблицах AV Chat: API сериализует время с
-- точностью до миллисекунд, и микросекунды, не переживающие round-trip через
-- JSON, уже один раз стоили бага в поллинге (см. примечание в 0034).
--
-- Файл идемпотентен целиком. Раннер (apps/api/src/index.ts) прогоняет КАЖДЫЙ
-- .sql при каждом старте и глотает ошибку на уровне файла — то есть первый же
-- упавший statement отменяет все последующие в этом файле. Поэтому
-- идемпотентен обязан быть каждый statement по отдельности, а не файл в целом.

-- ─── enum статуса тикета ──────────────────────────────────────────────────
-- Ровно два значения. «Нераспределённые» — это не статус, а open с
-- assigned_operator_id IS NULL; «Архив» — это closed. Держать их в enum
-- значило бы хранить одно и то же дважды и расходиться при передаче тикета.
DO $$ BEGIN
  CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ─── support_tickets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id"       uuid NOT NULL UNIQUE REFERENCES "conversations"("id") ON DELETE CASCADE,
  "status"                "support_ticket_status" NOT NULL DEFAULT 'open',
  "assigned_operator_id"  uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  -- Первый ответ оператора. Ставится один раз и НЕ сбрасывается при
  -- переоткрытии: это метка SLA на обращение, а не на текущий круг переписки.
  "first_response_at"     timestamptz(3),
  "closed_at"             timestamptz(3),
  -- CSAT, 1..5. smallint, потому что это оценка, а не счётчик.
  "rating"                smallint,
  -- Отметка авто-ответа «вне часов». Одна на тикет: без неё каждое сообщение
  -- пользователя в нерабочее время порождало бы ещё одно авто-сообщение.
  "auto_reply_sent_at"    timestamptz(3),
  "created_at"            timestamptz(3) NOT NULL DEFAULT now(),
  "updated_at"            timestamptz(3) NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Диапазон оценки — в БД, а не только в zod: CSAT приходит из пользовательского
-- чата, и единственная гарантия, переживающая любой путь записи, — это CHECK.
DO $$ BEGIN
  ALTER TABLE "support_tickets"
    ADD CONSTRAINT "support_tickets_rating_range" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Три очереди слева читаются одним и тем же предикатом (status + оператор):
-- «Мои» — status='open' AND assigned=me, «Нераспределённые» — status='open'
-- AND assigned IS NULL, «Архив» — status='closed'.
CREATE INDEX IF NOT EXISTS "support_tickets_status_operator_idx"
  ON "support_tickets" ("status", "assigned_operator_id");
--> statement-breakpoint

-- ─── support_notes ────────────────────────────────────────────────────────
-- Внутренние заметки оператора. Отдельная таблица, а НЕ строка в messages с
-- флагом is_internal: заметка не должна иметь ни одного способа доехать до
-- пользователя, а messages читает пользовательский мессенджер. Разделение
-- таблиц делает утечку невозможной, а не маловероятной.
CREATE TABLE IF NOT EXISTS "support_notes" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id"    uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  -- Автор заметки: SET NULL, чтобы удаление оператора не стирало саму заметку.
  "operator_id"  uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "text"         text NOT NULL,
  "created_at"   timestamptz(3) NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Тред сливает сообщения и заметки по времени — заметки берутся одним
-- диапазонным чтением по тикету.
CREATE INDEX IF NOT EXISTS "support_notes_ticket_created_idx"
  ON "support_notes" ("ticket_id", "created_at");
--> statement-breakpoint

-- ─── support_templates ────────────────────────────────────────────────────
-- Общие для всех операторов, не персональные: смысл шаблона в том, что вся
-- поддержка отвечает одинаково.
CREATE TABLE IF NOT EXISTS "support_templates" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"       varchar(120) NOT NULL,
  "body"        text NOT NULL,
  "created_by"  uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at"  timestamptz(3) NOT NULL DEFAULT now(),
  -- PUT /templates правит существующий шаблон; без updated_at «когда его в
  -- последний раз меняли» узнать неоткуда.
  "updated_at"  timestamptz(3) NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ─── support_audit ────────────────────────────────────────────────────────
-- Журнал действий оператора. Отдельный от audit_logs по той же причине, что и
-- exchange_audit (см. 0032): здесь нужна пара old_value/new_value как
-- запрашиваемые колонки — это единственное, что делает изменение телефона или
-- тарифа супер-админом разбираемым постфактум.
--
-- Все ссылки — SET NULL, а не CASCADE: журнал обязан пережить и удалённого
-- пользователя, и удалённый тикет, просто с обнулённой связью.
-- operator_id тоже SET NULL, а не NOT NULL: строку об уволенном операторе
-- терять нельзя.
CREATE TABLE IF NOT EXISTS "support_audit" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "operator_id"     uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "action"          varchar(60) NOT NULL,
  "target_user_id"  uuid REFERENCES "aivita_users"("id") ON DELETE SET NULL,
  "ticket_id"       uuid REFERENCES "support_tickets"("id") ON DELETE SET NULL,
  "reason"          text,
  "old_value"       text,
  "new_value"       text,
  "created_at"      timestamptz(3) NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "support_audit_created_idx"
  ON "support_audit" ("created_at" DESC);
--> statement-breakpoint

-- ─── смена оператора ──────────────────────────────────────────────────────
-- 'offline' | 'online'. varchar, а не enum: значение читает только автоответ
-- вне часов («есть ли хоть один online»), и расширить его до 'break' потом
-- дешевле, чем возиться с ALTER TYPE.
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "shift_status" varchar(20) NOT NULL DEFAULT 'offline';
--> statement-breakpoint

-- ─── бэкфилл: тикеты для уже существующих диалогов с поддержкой ───────────
-- На проде такой диалог один (от @umida_k), локально — сколько создаст сид.
-- Ник поддержки здесь литерал 'aivita' — SQL не видит SUPPORT_USER_NICKNAME.
-- Это не единственная защита: ensureTicket() в API заводит тикет лениво для
-- любого диалога с поддержкой, у которого тикета нет, резолвя ник из env.
-- Бэкфилл лишь избавляет от «первое открытие кабинета создаёт тикеты».
--
-- Все бэкфилленные тикеты — open и БЕЗ назначения: они попадают в
-- «Нераспределённые», что и есть правда о них.
--
-- ON CONFLICT по conversation_id: раннер прогоняет файл при каждом старте.
INSERT INTO "support_tickets" ("conversation_id", "status", "created_at", "updated_at")
SELECT cp."conversation_id", 'open', c."created_at", now()
FROM "conversation_participants" cp
JOIN "aivita_users" su ON su."id" = cp."user_id" AND su."nickname" = 'aivita'
JOIN "conversations" c ON c."id" = cp."conversation_id"
ON CONFLICT ("conversation_id") DO NOTHING;
