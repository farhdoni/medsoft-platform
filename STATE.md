# Состояние проекта (STATE.md) — раздел «Маркетинг»

Обновлено: 2026-09-07 02:00 · Ветка: `feature/marketing-section` · Сессия: восстановление страниц,
сведение прав, Dockerfile движка, Б3 (подготовка деплоя, без деплоя)

Файл покрывает только раздел «Маркетинг» админки (движок в `../marketing-engine-php`, восстановленные
email/push/referrals/analytics, права). Не весь `medsoft-platform`. Полный контекст задачи и правила
сессии — в `../marketing-engine-php/CONTEXT.md` и `../marketing-engine-php/STATE.md`.

---

## 📌 Статус

Раздел «Маркетинг» теперь один: один префикс адресов `/marketing/*`, один пункт меню верхнего уровня
с пятью подпунктами, один набор прав (`marketing:read`/`marketing:manage`, дублирующее `marketing`
убрано). Владелец решил восстановить пять страниц, удалённых коммитом `1b55e14` (email/push/referrals/
analytics) — они не были заглушками, готовились к запуску. Живые проверки Б2 повторены на новом
префиксе (`/marketing/engine`) — 6 из 6. Dockerfile движка чинился отдельно, в `marketing-engine-php`
(см. его `STATE.md`) — тот же баг с отсутствием router-скрипта, что чинили в README/start_server.bat
в прошлой сессии, был жив и в `entrypoint.sh`.

**Б3 выполнен** (документ, деплой не выполнялся): `../marketing-engine-php/DEPLOY.md`. Со стороны
этого репозитория Б3 фиксирует: переменная `MARKETING_ENGINE_URL` ресурса админки в Coolify должна
указывать на внутреннее имя сервиса движка; деплой админки — с `feature/marketing-section` **после**
мержа в `main` (сам мерж — отдельная будущая команда владельца, этой сессией не выполнялся, как и
пуш). Явно проверено и задокументировано в `DEPLOY.md`: ни один файл миграции/сидера `medsoft-platform`
не создаёт тестовые `b2test.*`-учётки — они существуют только в локальной dev-БД руками этой сессии.

Блок Б3 не начат. Следующий шаг — по прямой команде владельца.

## 🗺️ Дерево адресов раздела «Маркетинг» (решение владельца, на будущее — не менять без него)

Один префикс на все инструменты раздела, старые и будущие:
- `/marketing/engine/*` — прокси к движку (`marketing-engine-php`), было `/marketing/*`, переехало
  на уровень глубже, чтобы освободить корень под остальные страницы.
- `/marketing/email`, `/marketing/push`, `/marketing/referrals`, `/marketing/analytics` —
  восстановленные страницы, на прежних адресах (переезжать не пришлось, они и были под `/marketing/`).
- Новый инструмент в будущем — `/marketing/<имя>`. Список подпунктов меню — одна конфигурация
  (`MARKETING_TOOLS` в `sidebar.tsx`), новый инструмент добавляется одной строкой.

## 🛠️ Изменения этой сессии (только `feature/marketing-section`, не запушено)

### Восстановление страниц
Файлы вернулись из git как были на `1b55e14^` (до удаления), **без правок содержимого**, на
прежние пути:
- `apps/admin/src/app/(admin)/marketing/layout.tsx`
- `apps/admin/src/app/(admin)/marketing/email/page.tsx`
- `apps/admin/src/app/(admin)/marketing/push/page.tsx`
- `apps/admin/src/app/(admin)/marketing/referrals/page.tsx`
- `apps/admin/src/app/(admin)/marketing/analytics/page.tsx`

Бэкенд (`apps/api/src/routes/admin/marketing.ts`) не трогали — он и не удалялся, всю сессию был
смонтирован и рабочий, просто без пути из UI. Теперь путь есть.

### Движок переехал на `/marketing/engine`
- `apps/admin/src/app/marketing/[[...path]]/route.ts` → перемещён в
  `apps/admin/src/app/marketing/engine/[[...path]]/route.ts` (остаётся вне группы `(admin)` — это
  сырой reverse proxy, отдаёт HTML самого движка, а не рендерит через layout админки, как и было).
  Все внутренние пути (`/marketing/public-media/*` → `/marketing/engine/public-media/*`,
  `MARKETING_ENGINE_URL` без изменений — это адрес движка, не префикс) обновлены.
- `apps/admin/src/middleware.ts` — публичное исключение для робота Meta теперь на
  `/marketing/engine/public-media/*`.
- Заодно убрал дублирующиеся ветки в редиректе на `/auth/login` (в старом `route.ts` HTML- и
  не-HTML-случай вели к одному и тому же `NextResponse.redirect` — разницы не было, код просто
  повторялся).

### Права сведены к одному набору
`apps/api/src/lib/rbac.ts`:
- Право `marketing` убрано из `PERMISSIONS` — остались `marketing:read`, `marketing:manage`
  (существовали до Б2, ими же исторически огорожен `admin/marketing.ts`).
- `director`: было `marketing`, `marketing:read` → стало `marketing:read`, `marketing:manage`
  (владелец подтвердил: director должен иметь `manage`, не только `read` — раньше не имел).
- `marketer`: было `marketing`, `marketing:read`, `marketing:manage` → осталось
  `marketing:read`, `marketing:manage` (просто убрали дубль).
- Без миграций — словарь прав целиком в коде (`ROLE_RIGHTS`), как и было. Есть отдельная,
  сейчас неиспользуемая колонка `admin_roles.rights` (jsonb), заведённая миграцией `0050` —
  см. «Открытый пункт RBAC» ниже.

«Движок» в прокси-маршруте — под `marketing:manage` (публикация наружу — не чтение):
```ts
const hasEngineRight = isSuperadmin || operator.rights?.includes('marketing:manage');
```
Убрал прежние `operator.role === 'director' || operator.role === 'marketer'` — с полным правом
в словаре для обеих ролей они не нужны, а маскировали баг (см. ниже).

### Меню — одна конфигурация
`apps/admin/src/components/layout/sidebar.tsx`:
- Новый массив `MARKETING_TOOLS` (href/label/icon/anyRight) — 5 строк, один на каждый инструмент.
  Следующий инструмент = одна новая строка, разметку менять не нужно.
- `hasItemAccess` обобщена: было — специальная функция с зашитыми внутри `'marketing:read'`/
  `'marketing:manage'` (работала только потому, что до сих пор был ровно один защищённый пункт
  меню — расширять её на другие разделы было нельзя, не сломав). Стало — генерическая проверка
  `item.anyRight.some(r => me.rights.includes(r))`, права каждого пункта — его собственное поле.
- Подпункты и права: «Движок» → `marketing:manage`; «Рассылки»/«Push»/«Рефералы»/«Аналитика» →
  `marketing:read` ИЛИ `marketing:manage` (как было у них до Б2 — без ограничения по праву; теперь
  видимость сама собой ограничена принадлежностью к разделу, который целиком гейтится любым из
  двух прав).

### `scripts/test_block_b2.ts`
Обновлён под новый префикс — все 6 проверок бьют по `/marketing/engine/*`. Прогнан — 6 из 6.

## 🧪 Тестовые аккаунты (только локальная dev-БД, не в git)

| email | роль | `marketing:read` | `marketing:manage` | пароль (dev) |
|---|---|---|---|---|
| `b2test.marketer@local.dev` | `marketer` | ✅ | ✅ | `B2test-Marketer-9f13` |
| `b2test.director@local.dev` | `director` | ✅ | ✅ | `B2test-Director-9f13` |
| `b2test.noaccess@local.dev` | `accountant` | ❌ | ❌ | `B2test-NoAccess-9f13` |

Добавлен `b2test.director@local.dev` в этой сессии — специально проверить живьём, что `director`
после сведения прав действительно получил `marketing:manage` (было только `read`). Пароли — только
для локального dev-инстанса.

## ✅ Проверки этой сессии

**Шесть живых проверок Б2 на новом префиксе** (`npx tsx scripts/test_block_b2.ts`) — 6/6:
```
1. без сессии /marketing/engine              → 307 → /auth/login
2. сессия без marketing:manage (accountant)   → 403, экран админки
3. сессия с marketing:manage (marketer)       → 200, движок отрисован, CURRENT_OPERATOR с реальным ФИО
4. public-media/<опубликованный>              → 200, video/mp4, Accept-Ranges: bytes, размер точь-в-точь
5. public-media/<не из очереди>               → 404
6. /marketing/engine/api/... без сессии       → 307 → /auth/login
```
Заодно (не в скрипте, руками): `director` открывает `/marketing/engine` — `200 OK`, подтверждено
живым запросом с сессией `b2test.director@local.dev`.

**Четыре восстановленные страницы — руками, в браузере, под `b2test.marketer@local.dev`**:
- `/marketing/email` — таблица кампаний, шаблоны из `GET /v1/admin/marketing/email/templates`
  (реальные, не заглушка), форма отправки.
- `/marketing/push` — форма + «История рассылок» из `GET /v1/admin/marketing/push/history`.
- `/marketing/referrals` — KPI-карточки (Всего рефералов/Завершено/Вознаграждений/Конверсия) из
  `GET /v1/admin/marketing/referrals`.
- `/marketing/analytics` — воронка конверсии + retention (Day 1/7/30) из
  `GET /v1/admin/marketing/analytics`.
- `/marketing/engine` — полный интерфейс движка («Кампании», 27 готовых материалов) на новом адресе.

Под `b2test.noaccess@local.dev` (без `marketing:*`): группа «Маркетинг» **отсутствует в меню
целиком** (подтверждено — единственное совпадение по тексту «Маркетинг» на странице было имя самого
аккаунта, не пункт меню). Прямой заход на `/marketing/email` по URL — страница рендерится (как и до
Б2, у restored-страниц никогда не было собственного серверного гейта), но реальных данных не видно
(«Шаблоны не созданы» — бэкенд отдаёт 403 на `/email/templates`, форма отправки тоже упрётся в 403
у бэкенда при сабмите). Не менял — это и есть «как было», отдельная задача, если нужен серверный
гейт на уровне страницы, а не только API.

**Гейты**: `pnpm --filter @medsoft/admin typecheck`, `pnpm --filter @medsoft/api typecheck`,
`pnpm -r build` — все чистые (7/7 пакетов и приложений собраны, включая все 5 маршрутов раздела
«Маркетинг» — видно в выводе билда: `/marketing/analytics`, `/marketing/email`,
`/marketing/engine/[[...path]]`, `/marketing/push`, `/marketing/referrals`).

**e2e** (`e2e/`, Playwright): 22/22 теста в обоих прогонах этой сессии. Во втором прогоне внутри
теста `[C]` дважды мелькнула строка `FAIL` от собственного счётчика проверок спеки — официальный
результат Playwright остался 22 passed / 0 failed. `[C]` — тест AV Chat (непрочитанные сообщения),
никак не связан с разделом «Маркетинг»; похоже на тайминг-флак, не регрессия от этой сессии
(в предыдущей сессии тот же тест прошёл вообще без единой запинки).

## ⚠️ Открытый пункт: управляемые права (RBAC UI)

Владелец хочет сам настраивать, кто имеет доступ — не как отдельная задача этой сессии, а как
известный открытый пункт линии RBAC. Сейчас права живут **только в коде**
(`apps/api/src/lib/rbac.ts` → `ROLE_RIGHTS`), экран `/settings/roles` их только показывает,
редактировать нельзя.

Важная находка: таблица `admin_roles` уже имеет колонку `rights` (jsonb), заполненную миграцией
`0050_rbac_roles_seed.sql` — зеркало `ROLE_RIGHTS` на момент миграции (2026-09-01). Но
`getEffectiveRights()` в `rbac.ts` эту колонку **не читает** — только `admin_roles.name`, дальше
права берутся из захардкоженного `ROLE_RIGHTS` в коде. Колонка де-факто не используется рантаймом.
То есть схема для «прав из интерфейса» уже частично есть (роль → права, в БД), не хватает: (а)
рантайма, который читает `admin_roles.rights` вместо/в дополнение к `ROLE_RIGHTS`, и (б) самого
интерфейса редактирования на `/settings/roles`. Не бралось в эту сессию — фиксируется как открытый
пункт.

## 📚 История: находка про удалённую папку (закрыта в этой сессии)

В прошлой сессии было зафиксировано, что коммит `1b55e14` удалил пять страниц
(`apps/admin/src/app/(admin)/marketing/{layout,email/page,push/page,referrals/page,analytics/page}.tsx`)
— не заглушки, рабочий функционал, backend (`admin/marketing.ts`) остался смонтирован без пути из
UI. Решение владельца: восстановить — см. выше. Пункт закрыт.

---

## 🚀 Порты локального окружения (актуально на конец этой сессии)
- **Admin (`@medsoft/admin`):** `http://localhost:3000`
- **API (`@medsoft/api`):** `http://localhost:3001` (`API_PORT=3001` в `apps/api/.env`)
- **Aivita (`@medsoft/aivita`, для e2e):** `http://localhost:3005`
- **Postgres dev:** `aivita-postgres-local`, `localhost:5434`, БД `aivita`
- **Marketing engine (PHP, отдельный проект):** `http://127.0.0.1:8080`, обязательно с
  `BASE_PATH=/marketing/engine` (не просто `/marketing` — префикс сдвинулся) и `public/index.php`
  как router-скрипт — см. `../marketing-engine-php/README.md`.
