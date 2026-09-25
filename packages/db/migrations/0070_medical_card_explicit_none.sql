-- Явный ответ «нет» на вопросы об аллергиях и хронических болезнях.
--
-- До этого «аллергий нет» и «не отвечал» были неотличимы: оба — пустой
-- список в allergies / chronic_conditions. null — «не указано», true —
-- человек ответил «нет».
--
-- Существующие данные: пустое остаётся «не указано» (null). Единственное
-- исключение — тот, кто уже ответил «нет» в баннере-опроснике: survey_prompts
-- хранит событие 'answered', а записей в таблице у него нет и не было
-- никогда (ответ списком в опроснике всегда создаёт строки, в том числе
-- потом удалённые) — значит, это был именно ответ «нет».
--
-- Раннер в apps/api/src/index.ts прогоняет ВСЕ файлы при каждом старте API.
-- ADD COLUMN IF NOT EXISTS безопасен сам по себе, а перенос — нет: иначе он
-- при каждом перезапуске заново ставил бы «нет» тому, кто потом сам снял
-- этот ответ в профиле. Поэтому перенос разовый: после него на колонку
-- ставится комментарий-метка, и при следующих запусках блок ничего не делает.

ALTER TABLE "health_profiles"
  ADD COLUMN IF NOT EXISTS "allergies_none" boolean,
  ADD COLUMN IF NOT EXISTS "chronic_conditions_none" boolean;
--> statement-breakpoint
DO $$
BEGIN
  IF col_description('health_profiles'::regclass,
       (SELECT attnum FROM pg_attribute
        WHERE attrelid = 'health_profiles'::regclass AND attname = 'allergies_none'))
     IS DISTINCT FROM 'explicit-none; backfilled from survey_prompts (0070)' THEN

    UPDATE "health_profiles" hp
    SET "allergies_none" = true
    WHERE hp."allergies_none" IS NULL
      AND EXISTS (SELECT 1 FROM "survey_prompts" sp
                  WHERE sp."user_id" = hp."user_id" AND sp."field" = 'allergies' AND sp."status" = 'answered')
      AND NOT EXISTS (SELECT 1 FROM "allergies" a WHERE a."user_id" = hp."user_id");

    UPDATE "health_profiles" hp
    SET "chronic_conditions_none" = true
    WHERE hp."chronic_conditions_none" IS NULL
      AND EXISTS (SELECT 1 FROM "survey_prompts" sp
                  WHERE sp."user_id" = hp."user_id" AND sp."field" = 'chronicDiseases' AND sp."status" = 'answered')
      AND NOT EXISTS (SELECT 1 FROM "chronic_conditions" c WHERE c."user_id" = hp."user_id");

    COMMENT ON COLUMN "health_profiles"."allergies_none" IS 'explicit-none; backfilled from survey_prompts (0070)';
  END IF;
END $$;
