# Состояние проекта (STATE.md) — раздел «Маркетинг»

Обновлено: 2026-09-07 09:35 · Ветка: `main` · Сессия: полный аудит раздела «Движок» под тестовым
аккаунтом на проде, 1 дефект в этом репозитории исправлен и передеплоен

## ✅ Прокси `/marketing/engine/*` — потоковая пересылка тела запроса ломала загрузки > ~25-30 МБ

Найдено при полном аудите раздела «Движок» на проде (см. `../marketing-engine-php/STATE.md` за
2026-09-07 — там же ещё 2 дефекта, оба в движке, не здесь). Загрузка файла > 25-30 МБ через
`https://admin.aivita.uz/marketing/engine/api/media/upload` отвечала `HTTP 200` с ПУСТЫМ телом
ответа — движок при этом принимал и обрабатывал файл корректно (проверено напрямую curl'ом к
движку в обход этого прокси, и отдельным Node-скриптом с тем же паттерном `fetch()` вне Next.js —
оба отработали нормально). Причина — в `apps/admin/src/app/marketing/engine/[[...path]]/route.ts`:
тело входящего запроса пересылалось потоково (`fetchOptions.body = req.body; fetchOptions.duplex =
'half'`), и именно это потоковое чтение `req.body` у Route Handler'а Next.js молча обрывалось для
больших multipart-тел. Фикс — буферизация целиком через `req.arrayBuffer()` перед пересылкой, ценой
памяти на время запроса (приемлемо для одиночных загрузок медиа в админке). Тест:
`apps/admin/src/app/marketing/engine/[[...path]]/route.test.ts` (vitest; фиксирует структурный факт —
тело уходит к движку буфером точного размера, а не потоком/`duplex:'half'`).

Запушено в `farhdoni/medsoft-platform` `main`, штатный вебхук Coolify подхватил сам (без ручного
триггера) — как и раньше для этого репозитория.

---

Обновлено: 2026-09-07 06:55 · Ветка: `main` (`feature/marketing-section` смержена и запушена) ·
Сессия: восстановление страниц → сведение прав → Dockerfile движка → Б3 → деплой (гейты 0.5–3)

Файл покрывает только раздел «Маркетинг» админки (движок в `../marketing-engine-php`, восстановленные
email/push/referrals/analytics, права, деплой). Не весь `medsoft-platform`. Полный контекст задачи и
правила сессии — в `../marketing-engine-php/CONTEXT.md` и `../marketing-engine-php/STATE.md`.

---

## 📌 Статус — раздел «Маркетинг» в проде

`feature/marketing-section` смержена в `main` (коммит `314f134`, merge commit), гейты на итоговом
`main` (`tsc` admin+api, `pnpm -r build`, e2e 22/22 без падений) прогнаны до пуша. Запушено в
`farhdoni/medsoft-platform`, штатный вебхук Coolify (`manual_webhook_secret_github` на ресурсе
`medsoft-admin`) отработал сам — автодеплой, без ручного триггера.

`https://admin.aivita.uz/marketing/*` живой: движок на `/marketing/engine`, восстановленные
`/marketing/email`, `/push`, `/referrals`, `/analytics` — на прежних путях. Права сведены к
`marketing:read`/`marketing:manage`. Подробности реструктуризации URL и прав — в истории этого файла
(коммиты `4b4f67b`, `9b40e46`) и в `../marketing-engine-php/STATE.md`.

## 🚀 Деплой (гейты 0.5–3) — что сделано

**Доступ (гейт 0.5).** Токен Coolify для Claude Code выдан заново владельцем файлом (не в чат) —
первая попытка была read-only, вторая — рабочая (`write`+`deploy` подтверждены реальными вызовами,
не поверено на слово). Новый ed25519-ключ создан через Coolify API, публичная часть добавлена в
`farhdoni/medsoft` как **read-only** deploy key (`gh repo deploy-key add`, `read_only: true`
проверено через `gh api`). Клонирование проверено — забрал ключ обратно через API `security/keys`,
`git ls-remote` на сервере, сразу удалил временный файл.

**Пуш движка (гейт 1).** 80 коммитов в `farhdoni/medsoft` (репозиторий движка — это подпапка общего
рабочего репозитория, не отдельный репо) — регекс по всему диффу (connection-strings,
SECRET/TOKEN/API_KEY/PASSWORD, PEM-заголовки, AWS/GitHub/Slack/Telegram-паттерны) и `trufflehog`
(regex+entropy) по всей истории: 0 совпадений в диапазоне пуша (18 находок trufflehog — все в более
старых коммитах, уже на `github/main` до этого пуша). Запушено чисто.

**Ресурс движка (гейт 2).** Создан через `POST /api/v1/applications/private-deploy-key` (Coolify API,
без входа в UI под учёткой владельца). По ходу: Coolify по умолчанию сгенерировал публичный
`sslip.io`-домен — снял сразу после создания, до первого деплоя. Стабильное DNS-имя внутри сети
(`marketing-engine`) задано через `custom_network_aliases` — дефолтное имя контейнера у Coolify
меняется на каждом передеплое (`<uuid>-<таймстамп>`), alias — нет. После первого деплоя обнаружилось,
что `marketing.sqlite` не создаётся сам (см. `../marketing-engine-php/STATE.md` — инициализация
пустой схемы вручную, без сидера). Все проверки — в предыдущей записи этого файла и в
`marketing-engine-php/STATE.md`.

**Переменная и деплой платформы (гейт 3).** `MARKETING_ENGINE_URL=http://marketing-engine:8080`
добавлена в ресурс `medsoft-admin` через API **до** пуша, чтобы автодеплой сразу подхватил её. Мерж
и пуш — выше. Автодеплой (webhook) отследил через `GET /api/v1/deployments/{uuid}` до `finished`.

### Найдено и исправлено при внешней проверке на проде — не ловилось никакой внутренней проверкой

Четыре проверки без сессии на `https://admin.aivita.uz` (не с сервера, не из внутренней сети —
именно внешний запрос, как и должна была быть боевая проверка):
1. `/marketing/engine` → **307**, но `Location` вёл на `https://<container-id>:3000/auth/login...` —
   нерабочий адрес ни в одном браузере, хотя код ответа формально был правильный.
2. `/marketing/engine/api/...` → та же проблема.
3. `/marketing/engine/public-media/<несуществующий>` → `404 text/plain` — сразу чисто.
4. `/marketing/email`, `/push`, `/referrals`, `/analytics` → `307` на рабочий `/auth/login` (эти
   страницы идут через `middleware.ts`, у него такой проблемы не было — см. ниже).

**Причина (п.1-2):** `apps/admin/src/app/marketing/engine/[[...path]]/route.ts` строил редирект как
`new URL('/auth/login', req.url)`. За боевым nginx (`admin.aivita.uz` → `127.0.0.1:<порт>` →
контейнер, TCP-проброс Docker без переписывания заголовков) `req.url` в Node.js Route Handler
отражает собственный адрес контейнера, а не публичный домен — Next.js не использует заголовок `Host`
при сборке `req.url` в этом рантайме, хотя nginx его пробрасывает верно. `middleware.ts` (Edge-рантайм)
той же проблемы не имеет — там уже был относительный `Location`, и `/dashboard` (несвязанный
маршрут) это подтвердил при сравнении.

**Почему не поймали раньше:** локальная разработка, `docker exec` из контейнера `medsoft-admin`
(гейт 2) — оба обращаются к движку/приложению без внешнего nginx в цепочке, `req.url` в обоих случаях
случайно совпадал с чем-то рабочим. Только реальный внешний HTTPS-запрос через боевой nginx это
показал — ровно то, зачем боевая проверка нужна отдельно от локальной.

**Исправлено** (коммит `4db7102`, отдельно от мержа, сразу на `main`): оба места переведены на
относительный `Location` (`new Response(null, { status: 307, headers: { Location: '/auth/login?...' }})`),
как уже работало в `middleware.ts`. Передеплой через тот же вебхук, дождался `finished`, все четыре
проверки повторил — чисто.

## ✅ Свои четыре проверки (без сессии, боевой адрес) — готово

```
GET https://admin.aivita.uz/marketing/engine                          → 307, Location: /auth/login?from=...
GET https://admin.aivita.uz/marketing/engine/api/reaction/snapshots   → 307, Location: /auth/login?from=...
GET https://admin.aivita.uz/marketing/engine/public-media/<нет>       → 404, text/plain
GET https://admin.aivita.uz/marketing/{email,push,referrals,analytics} → 307×4, Location: /auth/login
```

## ⏳ Четыре проверки владельца — ждут

Под своей учёткой на `https://admin.aivita.uz`:
1. Меню «Маркетинг» → «Движок» открывается.
2. Медиатека — ролик больше 30 МБ, карточка появляется целиком.
3. Материал в очередь в сухом режиме → публичная ссылка с карточки → открыть с телефона через
   мобильный интернет (не Wi-Fi той же сети, где сервер) → файл играет.
4. Загрузка из п.2 видна в журнале движка (`/marketing/engine` → «Журнал») с именем владельца, не
   «Владелец (Локально)».

Где нажимать — см. сообщение в чате этой сессии (гейт 3, ответ владельцу).

---

## 🚀 Порты локального окружения (актуально на конец этой сессии)
- **Admin (`@medsoft/admin`):** `http://localhost:3000`
- **API (`@medsoft/api`):** `http://localhost:3001` (`API_PORT=3001` в `apps/api/.env`)
- **Aivita (`@medsoft/aivita`, для e2e):** `http://localhost:3005`
- **Postgres dev:** `aivita-postgres-local`, `localhost:5434`, БД `aivita`
- **Marketing engine (PHP, отдельный проект):** `http://127.0.0.1:8080`, обязательно с
  `BASE_PATH=/marketing/engine` и `public/index.php` как router-скрипт — см.
  `../marketing-engine-php/README.md`.
- **Прод:** ресурс Coolify `marketing-engine`, внутренняя сеть `coolify`, DNS-alias
  `marketing-engine:8080`, без публичного порта.

## ⚠️ Открытый пункт: управляемые права (RBAC UI) — без изменений с прошлой записи

См. предыдущую версию этого файла (git log) или `medsoft-platform` §rbac-model — колонка
`admin_roles.rights` (jsonb) в БД существует с миграции `0050`, но рантайм её не читает
(`getEffectiveRights()` использует только захардкоженный `ROLE_RIGHTS` в коде). Не бралось в эту
сессию.
