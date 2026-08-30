-- 0042: догоняющая — временные колонки AV Chat к timestamptz(3).
--
-- Почему миграция вообще нужна, хотя чистая база сегодня корректна.
--
-- Коммит 1167fc7 выпустил 0025, объявив временные колонки AV Chat наивным
-- `timestamp`. Коммит c979aba («AV Chat timestamps must be timestamptz, not
-- timestamp») исправил объявление, но сделал это ПРАВКОЙ УЖЕ ПРИМЕНЁННОЙ 0025
-- на месте и не добавил ни одного ALTER. А 0025 создаёт таблицы через
-- CREATE TABLE IF NOT EXISTS — на базе, где они уже есть, это молчаливый
-- no-op. Итог: любая база, поднятая ДО c979aba, навсегда осталась с наивными
-- колонками, и принести ей правильный тип нечем. Прод создан после и чист;
-- рабочие машины разработчиков — нет.
--
-- Чем это грозит. Драйвер разбирает `timestamp without time zone` как ЛОКАЛЬНОЕ
-- время (`new Date('2026-08-30 05:43:41')`), а пишет обратно `toISOString()`,
-- то есть UTC. На наивной колонке круговой путь через JS сдвигает значение на
-- смещение хоста назад: на UTC+5 — на пять часов. Так, например, отметка
-- прочтения оказывалась «глубже прошлого», `created_at > last_read_at`
-- оставалось истинным и бейдж непрочитанного не снимался никогда.
--
-- Приведение: USING <col> AT TIME ZONE 'UTC' — и это единственная верная
-- форма. Значения писались как toISOString(), поэтому хранимый наивный
-- wall-clock УЖЕ является UTC. Голый ::timestamptz истолковал бы его в
-- таймзоне сессии и сдвинул данные второй раз.
--
-- Идемпотентность: каждая колонка трогается, только если она существует И
-- фактически наивная. На проде и на любой чистой базе миграция не выполняет
-- ни одного ALTER и не меняет md5 схемы — строгий no-op.
--
-- Гард сверяет только data_type. Расхождение по precision (например,
-- timestamptz(6) вместо ожидаемых (3)) намеренно не исправляется — колонка
-- уже timestamptz, направление безопасное, а сужать precision — отдельное
-- решение, не задача этой миграции.
--
-- ai_usage_logs.created_at НЕ трогаем: она объявлена наивной и в drizzle,
-- расхождение там обратного, безопасного направления (см. SCHEMA-BASELINE).
--
-- ПРАВИТЬ УЖЕ ПРИМЕНЁННЫЕ МИГРАЦИИ ЗАПРЕЩЕНО. Исправление приезжает только
-- новым файлом — иначе получается ровно эта ситуация.

DO $$
DECLARE
  targets text[][] := ARRAY[
    ['messages',                  'created_at'],
    ['messages',                  'deleted_at'],
    ['conversation_participants', 'last_read_at'],
    ['conversation_participants', 'joined_at'],
    ['conversations',             'created_at'],
    ['conversations',             'last_message_at'],
    ['message_reports',           'created_at'],
    ['message_reports',           'reviewed_at'],
    ['user_blocks',               'created_at']
  ];
  i               int;
  tbl             text;
  col             text;
  actual          text;
  applied         int := 0;
  skipped_already int := 0;
  skipped_absent  int := 0;
BEGIN
  -- ALTER COLUMN TYPE берёт ACCESS EXCLUSIVE на таблицу; если её держит долгий
  -- запрос, миграция не должна виснуть неопределённо — лучше явная ошибка.
  SET LOCAL lock_timeout = '5s';

  FOR i IN 1 .. array_length(targets, 1) LOOP
    tbl := targets[i][1];
    col := targets[i][2];

    SELECT c.data_type INTO actual
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name   = tbl
       AND c.column_name  = col;

    IF actual IS NULL THEN
      skipped_absent := skipped_absent + 1;
      RAISE NOTICE 'SKIP    %.% - table or column not found', tbl, col;

    ELSIF actual <> 'timestamp without time zone' THEN
      skipped_already := skipped_already + 1;
      RAISE NOTICE 'SKIP    %.% - already "%"', tbl, col, actual;

    ELSE
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz(3) USING %I AT TIME ZONE ''UTC''',
        tbl, col, col
      );
      applied := applied + 1;
      RAISE NOTICE 'ALTERED %.% - timestamp -> timestamptz(3)', tbl, col;
    END IF;
  END LOOP;

  RAISE NOTICE '--------------------------------------------------';
  RAISE NOTICE 'TOTAL 0042: altered=%, skipped_already_tz=%, skipped_absent=%',
    applied, skipped_already, skipped_absent;

  IF applied = 0 THEN
    RAISE NOTICE 'TOTAL 0042: zero ALTERs - schema already correct (no-op)';
  END IF;
END $$;
