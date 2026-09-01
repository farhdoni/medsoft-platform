-- 0044: platform_settings — таблица объявлена в схеме, но не создана ни одной
-- миграцией.
--
-- Commit d394497 (15.05) добавил platformSettings в packages/db/src/schema/
-- payments.ts и роут apps/api/src/routes/admin/platform-settings.ts в одном
-- коммите, но .sql-миграцию — нет: git log -S по всей истории (--all) не
-- находит ни одной миграции, когда-либо упоминавшей platform_settings, то
-- есть файл не удалялся — его никогда не было. На проде таблица тем не менее
-- существует и совпадает со схемой до последней детали: имя уникального
-- ограничения platform_settings_key_key — фирменное авто-именование
-- Postgres/drizzle для инлайнового .unique() без явного имени, а updated_at
-- на проде — тот же наивный timestamp без timezone, что и в самой схеме
-- (schema.ts тут не объявляет withTimezone: true — не баг, тип сходится с
-- тем, что реально хранится). Такое совпадение делает ручной CREATE TABLE
-- маловероятным объяснением; наиболее вероятная причина — прямой
-- drizzle-kit push мимо системы миграций. Прямых логов, подтверждающих
-- именно это, нет — это обоснованный вывод, не факт с доказательством.
--
-- Правило прежнее (см. SCHEMA-BASELINE.md): применённые миграции не
-- редактируются, а голый CREATE TABLE IF NOT EXISTS на базе, где таблица уже
-- есть — это ровно мина 0025, поймана трижды и тут не повторяется.
--
-- Поведение ровно такое: создаёт таблицу, только если её нет. Если таблица
-- уже есть, а набор колонок разошёлся с ожидаемым — миграция НИЧЕГО НЕ
-- ИСПРАВЛЯЕТ, только пишет MISMATCH в лог с полным составом ожидаемых и
-- фактических колонок. Расхождение чинится отдельной миграцией, написанной
-- под конкретную находку, — не этим файлом задним числом.

DO $$
DECLARE
  tbl_exists boolean;
  expected   text[] := ARRAY['id', 'key', 'value', 'updated_at'];
  actual     text[];
  missing    text[];
  extra      text[];
BEGIN
  SET LOCAL lock_timeout = '5s';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'platform_settings'
  ) INTO tbl_exists;

  IF NOT tbl_exists THEN
    CREATE TABLE "platform_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar(100) NOT NULL UNIQUE,
      "value" text,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    RAISE NOTICE 'CREATED platform_settings — table did not exist';
  ELSE
    SELECT array_agg(column_name ORDER BY column_name) INTO actual
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'platform_settings';

    SELECT array_agg(e ORDER BY e) INTO missing
      FROM unnest(expected) e WHERE e <> ALL(COALESCE(actual, ARRAY[]::text[]));
    SELECT array_agg(a ORDER BY a) INTO extra
      FROM unnest(actual) a WHERE a <> ALL(expected);

    IF missing IS NULL AND extra IS NULL THEN
      RAISE NOTICE 'SKIP platform_settings — already exists, columns match: %', actual;
    ELSE
      RAISE NOTICE 'SKIP platform_settings — already exists, MISMATCH. expected=% actual=% missing=% extra=%',
        expected, actual, COALESCE(missing, ARRAY[]::text[]), COALESCE(extra, ARRAY[]::text[]);
    END IF;
  END IF;
END $$;
