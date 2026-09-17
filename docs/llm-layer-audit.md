# Аудит AI/LLM-вызовов в medsoft-platform

Дата: 2026-09-17. Основа — независимая проверка кода (grep + построчное чтение всех найденных файлов), не просто пересказ более раннего наброска. Где набросок был неточен — это явно отмечено ниже, с фактическими цифрами вместо него.

## 1. Точки вызова: 13, а не 11

Набросок называл 11 точек — фактически их **13**, в 11 файлах (`medications.ts` и `nutrition.ts` содержат по две независимые точки вызова).

Также два файла-«ложных срабатывания» grep, которые выглядят как кандидаты по названию, но LLM не вызывают:
- `apps/api/src/routes/aivita/ai-chat.ts` — только сохраняет/архивирует историю чата (`aiChatMessages`, `aiChatArchives`) и проверяет дневной лимит; сам к модели не обращается.
- `apps/api/src/routes/aivita/messaging.ts` (человеческий AV-чат) — совпал по regex `messages\.create` из-за Drizzle-вызова `messages.createdAt`, к AI отношения не имеет.

| # | Файл : строки | Функция / роут | Назначение | Модель | Способ вызова |
|---|---|---|---|---|---|
| 1 | `apps/api/src/routes/aivita/symptom-checker.ts:81-92` | `callClaudeSymptom` (`/symptom-checker/start`, `/answer`) | Интерактивный опрос симптомов | `claude-haiku-4-5` | raw `fetch` |
| 2 | `apps/api/src/routes/aivita/doctor/scribe.ts:46-52` | `POST /doctor/scribe/` | Транскрипт приёма → SOAP-заметка | `claude-sonnet-4-6` | SDK |
| 3 | `apps/api/src/routes/aivita/drugs.ts:46-55` | `askClaude` (`/check`, `/check-for-patient`, `/my-check`) | Проверка совместимости лекарств (AI — фолбэк при промахе кэша БД) | `claude-haiku-4-5-20251001` | SDK |
| 4 | `apps/api/src/routes/aivita/health-analysis.ts:143-161` | `runClaudeAnalysis` (`/health-analysis/run`) | Предиктивный анализ здоровья (score, риски, план) | `claude-sonnet-4-5` | raw `fetch` |
| 5 | `apps/api/src/routes/aivita/medical.ts:71-84` | `callClaudeWithFile` (`/medical/parse-document`) | Разбор загруженного мед. документа/снимка | `claude-sonnet-4-5` | raw `fetch` |
| 6 | `apps/api/src/routes/aivita/medications.ts:605-643` | `POST /medications/parse-receipt` | Распознавание рецепта с фото | `claude-sonnet-4-6` | SDK |
| 7 | `apps/api/src/routes/aivita/medications.ts:702-731` | `POST /medications/identify` | Идентификация таблетки/лекарства по фото | `claude-sonnet-4-6` | SDK |
| 8 | `apps/api/src/routes/aivita/mental-health.ts:162-175` | `POST /mental/therapist/message` | КПТ-чат психологической поддержки | `claude-haiku-4-5` | raw `fetch` |
| 9 | `apps/api/src/routes/aivita/nutrition.ts:130-160` | `POST /nutrition/recognize` | Распознавание еды по фото → калории/БЖУ | `claude-haiku-4-5` | raw `fetch` |
| 10 | `apps/api/src/routes/aivita/nutrition.ts:206-233` | `POST /nutrition/plan` | Недельный план питания | `claude-haiku-4-5` | raw `fetch` |
| 11 | `apps/api/src/routes/aivita/onboarding.ts:42-46` | `generateSnapshotInsight` (`/onboarding/snapshot`) | Персональный инсайт к Health Score при онбординге | `claude-sonnet-4-6` | raw `fetch` |
| 12 | `apps/api/src/routes/aivita/checkup.ts:108-121` | `callClaude` (`/checkup/run`) | «AI Предиктивная медицина» чекап | `claude-sonnet-4-5` | raw `fetch` |
| 13 | `apps/aivita/app/api/ai/chat/route.ts:289-302` | `POST /api/ai/chat` | Основной стриминговый AI-чат (пациент) | `claude-sonnet-4-6` | SDK, `.messages.stream` |

**Внутренняя несогласованность вызова:** 5 точек используют установленный `@anthropic-ai/sdk`, 8 — вручную собирают `fetch('https://api.anthropic.com/v1/messages', …)` с задублированной логикой заголовков/парсинга/снятия markdown-обёртки, хотя SDK уже есть в зависимостях `apps/api`.

## 2. Разнобой моделей — подтверждено, 4 разные строки

| Строка модели | С датой? | Где используется |
|---|---|---|
| `claude-haiku-4-5` | нет | symptom-checker.ts, mental-health.ts, nutrition.ts ×2 (4 точки) |
| `claude-haiku-4-5-20251001` | да | drugs.ts (1 точка) |
| `claude-sonnet-4-5` | нет | checkup.ts, health-analysis.ts, medical.ts (3 точки) |
| `claude-sonnet-4-6` | нет | doctor/scribe.ts, medications.ts ×2, onboarding.ts, apps/aivita chat/route.ts (5 точек) |

Набросок про sonnet-4-5/4-6 — подтверждён. Дополнительно найден недокументированный разнобой и внутри haiku: одна точка пришпилена к снапшоту (`-20251001`), четыре — на голый алиас, который может тихо переехать на другой снапшот сам по себе.

`claude-opus-4-7` фигурирует только как неиспользуемая опция в выпадающем списке админки (`apps/admin/.../settings/ai/page.tsx:200`) — ни одна точка вызова её не использует.

## 3. Разнобой SDK — подтверждено

- `apps/api/package.json` → `"@anthropic-ai/sdk": "^0.40.0"` → резолвится в **0.40.1**.
- `apps/aivita/package.json` → `"@anthropic-ai/sdk": "^0.91.1"` → резолвится в **0.91.1**.
- Больше нигде в монорепе (admin, packages/db, packages/shared, mobile-*, landing) SDK нет.
- OpenAI/Gemini SDK нет нигде — при том что admin-UI предлагает опции провайдера «Ollama»/«Hybrid» без единой реализации за ними (чистая декорация, см. §7).

## 4. Дублирование

- **Три независимых сборщика «контекст пациента для анализа здоровья»**: `checkup.ts`'s `buildUserContext`, `health-analysis.ts`'s `gatherPatientContext`, `apps/aivita/lib/ai/patientContext.ts`'s `buildPatientContext` (HTTP-реализация для чата). Все три отдельно тянут профиль/витальные/аллергии/хронику/лекарства и форматируют в текст — ни один код не переиспользуется.
- **Четыре независимых «фото → Claude Vision → снять markdown-обёртку → JSON.parse»**: `medications.ts` `/parse-receipt` и `/identify`, `medical.ts`, `nutrition.ts` `/recognize` — каждый заново пишет одну и ту же base64/media-type/fence-strip логику.
- **8 из 13 точек вручную дублируют один и тот же raw-fetch-бойлерплейт** — риск скорее для согласованности/поддержки, чем функциональный дубль.
- Два независимых «AI-чата» (`mental-health.ts` КПТ-терапевт и основной `chat/route.ts`) — у каждого свой срез истории сообщений и свой системный промпт без общей абстракции.

## 5. `ai_logs` — подтверждено осиротевшей (объявлена и никогда не используется)

Схема в `packages/db/src/schema/ai-logs.ts` (id, patient_id, session_id, intent, outcome, model_name, model_latency_ms, resulting_appointment_id...) создана ещё в базовой миграции `0000_exotic_baron_strucker.sql`, с FK из `appointments.ai_log_id`. Экспортируется из пакета — импортировать можно. Но во всём репозитории **нет ни одного `db.insert(aiLogs)` и ни одного `db.select().from(aiLogs)`** — только FK-объявление в `appointments.ts` и зеркальное поле в zod-схеме, которое нигде не устанавливается.

Причина видна по самой схеме: таблица спроектирована под более раннюю модель «AI-триаж → запись к врачу» (`intent: 'doctor_recommendation'`, `outcome: 'appointment_booked'`), которая предшествует AIVITA. Нынешний symptom-checker пишет в свою собственную `symptomSessions`, у каждой AIVITA-фичи — своя таблица (`healthAnalysis`, `healthCheckups`, `nutritionPlans`, `mentalTherapistMessages`, `drugInteractions`, `aiChatMessages`/`aiChatArchives`). `ai_logs` — наследие продукта, на которое так ничего и не перенесли.

## 6. `ai_usage_logs` — НЕ рассинхрон колонок (набросок здесь неточен); реальная проблема — отсутствие писателей

Миграция `0011_ai_usage_logs.sql`, Drizzle-схема `ai-usage-logs.ts`, бэкенд `apps/api/src/routes/admin/ai.ts` (`GET /v1/admin/ai/logs`, `GET /v1/admin/ai/usage-summary`) и фронтенд `apps/admin/.../settings/ai/page.tsx` — **согласованы между собой на 100%**, один и тот же набор колонок везде: `id, user_id (integer), module, model, input_tokens, output_tokens, cost_usd, response_time_ms, created_at`.

Проверено лично (не только агентом): прочитан текст миграции 0011 и схемы — колонки совпадают дословно.

**Реальный дефект:** во всём репозитории `aiUsageLogs` упоминается только в `admin/ai.ts`, и каждое упоминание — `SELECT`/агрегат, ни одного `INSERT`. Ни одна из 13 точек вызова из §1 — включая точки на SDK, которые получают реальные цифры usage в ответе, — никогда не пишет в эту таблицу. Полностью собранный дашборд админки всегда показывает 0 запросов, $0 и пустой лог, потому что сторона-writer не была построена вообще ни для одной точки.

**Отдельная проблема, актуальная для Части B этой ветки:** колонки под `cache_read_input_tokens`/`cache_creation_input_tokens` в этой таблице (как и в схеме) **действительно отсутствуют** — это не придумано в наброске, я перечитал миграцию и схему построчно. Их придётся добавить новой миграцией.

**Также подтверждено:** `user_id` — `integer`, без FK. AIVITA-пользователи (`aivitaUsers.id`) — `uuid`. Это два несовместимых пространства идентификаторов: колонка `user_id` явно проектировалась под другую (вероятно, изначальную клиника-сторону с целочисленными PK — например `doctors`), а не под AIVITA-пациентов. Поскольку писателей в эту таблицу нет вообще ни одного, никакой существующий код это поведение не задаёт — при добавлении логирования AIVITA-чата нельзя просто писать UUID в `user_id`; нужен отдельный столбец под UUID (см. план миграции Части B ниже), а `user_id` для чат-модуля оставить NULL.

## 7. `platformSettings` — в основном декоративно, кроме одной настройки

- Таблица `platformSettings` (`packages/db/src/schema/payments.ts:168-173`, ключ/значение) — её собственная миграция `0044_platform_settings.sql` прямо документирует, что таблица никогда не создавалась отслеживаемой миграцией и существует в проде только через незалогированный `drizzle-kit push`.
- Админ хранит 9 AI-ключей: `ai_provider, ai_model, ai_system_prompt_chat, ai_system_prompt_checkup, ai_system_prompt_scribe, ai_max_tokens, ai_temperature, ai_daily_limit_per_user, ai_monthly_limit_per_user` — все редактируемы через `settings/ai/page.tsx`.
- Ни одна из 13 точек вызова из §1 не импортирует `platformSettings`. Каждая точка сама зашивает свою модель (§2) и свой промпт-константу. Значит `ai_model`, `ai_provider`, три `ai_system_prompt_*`, `ai_max_tokens`, `ai_temperature` — **чисто декоративны**: админ меняет модель в дропдауне, сохраняет — а ниже по цепочке это никто не читает.
- **Единственное исключение:** `ai_daily_limit_per_user` реально читается и применяется — `apps/api/src/routes/aivita/ai-chat.ts` (`GET /ai-chat/daily-usage`) и `apps/aivita/app/api/ai/chat/route.ts` (`checkDailyLimit`, HTTP 429 при превышении) — но только для основного чата (точка #13). `checkup.ts` использует свой отдельный, зашитый лимит «1 бесплатный чекап в календарный месяц», никак не связанный с `platformSettings`.
- `ai_monthly_limit_per_user` — хранится, редактируется в UI, но нигде не читается обратно; декоративен так же, как модель/промпты, просто без даже частичного использования.

Итог: 8 из 9 AI-настроек платформы декоративны; реально работает только `ai_daily_limit_per_user`, и то лишь для 1 из 13 точек вызова.

## 8. Текущая структура `apps/aivita/app/api/ai/chat/route.ts` (перед правками Части B)

- Клиент SDK создаётся заново на каждый запрос (`new Anthropic({ apiKey })`), не модульный синглтон.
- Вызов модели: `client.messages.stream({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: systemPrompt /* строка */, messages: visionMessages.slice(-10) })`. `cache_control` нигде не используется.
- `systemPrompt` — один константный текст (язык определяет сама модель по последнему сообщению пользователя), к которому построчно приклеиваются: контекст пациента (`buildPatientContext`, параллельный HTTP к 6 эндпоинтам `apps/api` с форвардом сессионной куки `aivita_api` — id пациента нигде не передаётся клиентом, только сессией) и, при совпадении по ключевым словам, блок результата проверки лекарств (`checkDrugInteractions` → `/v1/aivita/drugs/check`, точка вызова #3).
- Суточный лимит проверяется до обращения к Anthropic (`checkDailyLimit` → `ai-chat/daily-usage`, единственная реально работающая настройка из §7).
- Потоковый ответ — `ReadableStream`, транслирует `content_block_delta`/`text_delta` в SSE. **usage из финального объекта стрима нигде не читается** — ни в `ai_usage_logs`, ни в `ai_logs`, что и подтверждает вывод §6.
- Мок-режим (нет реального ключа или SDK бросил исключение) — молча отдаёт заготовленный ответ, тоже нигде не логируется.

## Предложение: `packages/llm`

Не создаётся в рамках этой ветки (отдельная будущая линия работы, явно исключено правилами задачи) — только фиксирую предложение и порядок переноса для дальнейшего планирования.

**Идея:** единая тонкая обёртка над Anthropic SDK в `packages/llm`, куда переехали бы:
- один клиент (синглтон) вместо создания `new Anthropic()` на каждый запрос там, где это сейчас происходит;
- общая функция логирования usage → `ai_usage_logs` (то, что строится точечно для чата в Части B этой ветки, для ОДНОЙ точки — стало бы переиспользуемым для всех 13);
- общий helper для vision-запросов (base64 + fence-stripping + JSON.parse), закрывающий дублирование из §4;
- фактическое чтение `platformSettings` (model/max_tokens/temperature/system-prompt) вместо хардкода — тогда 8 декоративных настроек из §7 станут реальными;
- единая версия SDK вместо разнобоя `^0.40`/`^0.91` из §3.

**Порядок переноса (предлагаемый, не выполняется сейчас):**
1. Сначала — единая точка логирования usage (Часть B этой ветки как прототип на одной точке, затем растиражировать на все 13).
2. Затем — миграция всех 8 raw-`fetch`-точек на общий SDK-клиент (устраняет дублирование бойлерплейта, не меняя поведение).
3. Затем — подключение чтения `platformSettings` вместо хардкода модели/промптов (начиная с `ai_model`/`ai_max_tokens`/`ai_temperature`, которые не требуют менять сам текст промптов).
4. В последнюю очередь — консолидация трёх «сборщиков контекста пациента» (§4) в один, поскольку у них разный набор потребителей (SDK-запрос vs HTTP-запрос из другого процесса) и это самый рискованный перенос из всех.
5. Единая версия SDK — можно сделать в любой момент этой последовательности отдельным коммитом (`apps/api` поднять `^0.40` до `^0.91`), риск низкий, но требует прогона всех 12 точек в `apps/api` на новой версии перед мержем.

**Риски консолидации (не решается в этой ветке, только фиксируется):**
- Три сборщика контекста пациента идут разными путями (прямой DB-доступ в `apps/api`-точках vs HTTP-форвард сессии в `apps/aivita`) — наивное объединение может случайно дать `apps/aivita`-коду прямой доступ к БД, чего сейчас архитектурно нет и что стоит сохранить намеренно.
- `ai_logs` стоит явно удалить (или задокументировать как окончательно устаревшую) до, а не после переноса на `packages/llm`, чтобы не тащить мёртвую таблицу в новый общий слой.
- Включение чтения `platformSettings` в реальные вызовы — поведенческое изменение (модель/промпт реально начнут меняться из админки), нужно отдельное тестирование по каждой из 13 точек, не один общий PR.
