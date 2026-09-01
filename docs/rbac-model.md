# Единый словарь ролей и прав — проект

Разведка и проектирование. Кода нет, миграций нет, прод не тронут. Это документ
для решения, не готовая к выкатке схема.

**Источник для раздела 6 не найден.** Задание ссылалось на «раздел 3 ТЗ по
кабинетам» — какой раздел видит каждая роль. Просмотрены `Глобальное
ТЗ.docx` (его раздел 3 — франшиза/маркетплейс врачей/страховые/B2B, не про
роли) и все обнаруженные аудит-отчёты (`MedSoft_Full_Audit_Report*.docx` и
рядом) — ни один не описывает ролевые кабинеты персонала. Роли в разделе 6
спроектированы по смыслу их названий и по фактической структуре панели, а не
выведены из документа. Если нужный файл лежит не там, где я искал — дайте
путь, пересоберу раздел 6 под него.

---

## 1. Три существующих словаря ролей

### 1.1 `admin_role` — enum в Postgres (`packages/db/src/schema/admins.ts:3`)

```
'superadmin' | 'admin' | 'viewer'
```

Единственное поле, которое реально попадает в JWT (`payload.role`) и в
`c.get('adminRole')`. Используется в 9 местах:

| Файл | Что делает |
|---|---|
| `middleware/auth.ts:47` | `requireSuperadmin` — `adminRole !== 'superadmin'` |
| `middleware/auth.ts:70` | `requireOperator` — сверяет с `OPERATOR_ROLES` (см. 1.2) |
| `routes/index.ts:295,301` | сидер супер-админа при старте |
| `admin/src/.../admins/page.tsx:41,71` | UI: бейдж роли, доступность действий |
| `admin/src/.../aivita/support/page.tsx:704` | UI: кнопка снятия PII-блока только superadmin |
| `admin/src/.../settings/team/page.tsx:67` | UI: спецобработка `role === 'admin'` |
| `admin/src/components/layout/sidebar.tsx:165` | UI: пункт «Админы» только superadmin |

### 1.2 `OPERATOR_ROLES` — хардкод-массив (`middleware/auth.ts:54`)

```ts
const OPERATOR_ROLES = ['superadmin', 'admin', 'moderator', 'support'];
```

Используется в `requireOperator` (2 проверки в том же файле, единственный
потребитель — `aivita-admin-support.ts`, кабинет поддержки). Два из четырёх
значений (`moderator`, `support`) **не существуют** в enum 1.1 — это
самостоятельный, третий словарь имён, который пересекается с 1.1 только
частично.

### 1.3 `admin_roles.name` — таблица на проде, редактируется из панели

```sql
select id, name, display_name from admin_roles order by id;
```
```
1  superadmin   Супер-администратор
2  admin        Администратор
3  moderator    Модератор
4  support      Поддержка
5  marketing    Маркетинг
6  finance      Финансы
```

Свободный текст — панель (`settings/roles/page.tsx`) не ограничивает `name`
ничем. Используется в 2 файлах: `middleware/auth.ts` (только `.name`, для
джойна в `requireOperator`) и `routes/admin/users.ts` (CRUD + отдача списка).
`admin_user_roles` (таблица назначений роль→пользователь) **пуста** — 0
строк на проде. Итог: 6 ролей заведены, но не привязаны ни к одному живому
админу; вся реальная авторизация сегодня идёт через enum 1.1.

---

## 2. Тринадцать флагов `AdminPermissions` — фактический смысл

Тип объявлен в `packages/db/src/schema/admins.ts:50-64`, редактируется как
чекбоксы в `settings/roles/page.tsx`. Проверено по всей кодовой базе (grep
вне схемы и вне самого редактора):

| Флаг | Проверяется где-либо как гейт? |
|---|---|
| `dashboard` | **нет** |
| `users_read` | **нет** |
| `users_edit` | **нет** |
| `users_delete` | **нет** |
| `doctors_verify` | **нет** |
| `finance_read` | **нет** |
| `finance_edit` | **нет** |
| `payouts` | **нет** |
| `marketing` | **нет** |
| `settings` | **нет** |
| `roles` | **нет** |
| `ai_settings` | **нет** |
| `system` | **нет** |

**Все 13 — ложный интерфейс.** Панель их отображает и позволяет редактировать
как настоящую матрицу прав, но ни один флаг нигде не читается на пути запроса
к API. Реальная защита — только `requireAuth`/`requireSuperadmin`/
`requireOperator` по строке роли (раздел 1), везде грубее, чем эти 13 флагов
обещают.

---

## 3. Карта ~205 маршрутов и предлагаемые права

205 — это реальный админский периметр: `/v1/admin/*`, `/v1/admins`,
`/v1/aivita-admin*`, админ-часть `clinic-requests.ts`. Не включает публичный
API AIVITA для пациентов/врачей (отдельный периметр, отдельная авторизация).

Право — на **осмысленное действие**, не на маршрут. Формат `раздел:действие`.

| Раздел панели | Файл(ы) роутера | Маршрутов | Права |
|---|---|---|---|
| Основное (дашборд, пациенты, врачи, клиники, приёмы, транзакции, SOS, мониторинг) | `admin/dashboard.ts`, `admin-monitoring.ts` + читающая часть общих таблиц | 7 | `main:read` |
| Пользователи (Aivita) | `aivita-admin.ts` (`/users/*`) | ~9 | `users:read`, `users:edit` (patch/verify/подписка), `users:delete` (block/delete) |
| AIVITA → Врачи | `aivita-admin.ts` (`/aivita-doctors/*`) | 5 | `aivita:doctors_manage` |
| AIVITA → Биллинг | `aivita-admin.ts` (`/billing/*`) | 4 | `aivita:billing` |
| AIVITA → Главная / Уведомления | `aivita-admin.ts` (`/home-settings`, доп.) | ~4 | `aivita:content` |
| AIVITA → Поддержка | `aivita-admin-support.ts` | 38 | `aivita:support` (базовый), `aivita:support_pii` (полная карточка/разблокировка PII — сегодня это и есть `requireSuperadmin` внутри файла) |
| Партнёры (аптеки/лаборатории/клиники) | `admin-partners.ts`, `admin-pharmacies.ts` | 8 | `partners:read`, `partners:manage` (создание, активация/деактивация, выпуск ключа) |
| Маркетинг | `admin/marketing.ts` | 12 | `marketing:manage` (рассылки/пуши/промо), `marketing:analytics_read` |
| Контент (лендинг/соцсети/FAQ) | `admin/content.ts`, `landing-content.ts` | 18 | `content:manage` |
| Контент → Заявки клиник | `clinic-requests.ts` (админ-часть) | 3 | `content:clinic_requests` |
| Безопасность | `admin/security.ts` | 5 | `security:read` (журнал входов), `security:manage` (блокировки IP) |
| Отчёты | `admin/reports.ts` | 3 | `reports:generate` |
| Финансы — обзор/платежи/подписки | `admin/finance.ts` | 16 | `finance:read`, `finance:edit` (возврат, ручное создание выплаты, промокод) |
| Финансы → Выплаты | `admin/payouts.ts` | 8 | `finance:edit` |
| Финансы → Настройки (комиссии) | `admin/platform-settings.ts` | 2 | `finance:settings` — сегодня это жёстко `requireSuperadmin` (моя недавняя правка), в целевой модели — отдельное право |
| Система (логи/бэкапы/домены/общие/SMS/email) | `admin/system.ts`, `admin/settings.ts` | 20 | `system:read` (логи/мониторинг), `system:manage` (бэкапы, домены, рассылка-конфиг) |
| AI-настройки | `admin/ai.ts`, `settings/ai` | 8 | `settings:ai` |
| Настройки → Роли | `admin/users.ts` (`/roles/*`) | 4 | `settings:roles` |
| Настройки → Команда | `admin/users.ts` (`/team/*`) | 3 | `settings:team` |
| Админы (суперадмины) | `admins.ts` | 8 | `admins:manage` (уже `requireSuperadmin` централизованно — образец) |
| Уведомления (админские) | `admin/notifications.ts` | 3 | `system:read` |

Итого предложенных прав: **21** (без учёта раздела 4). Компактно относительно
205 маршрутов и 20+ разделов панели.

---

## 4. Медицинские данные, согласия, выписки — третий уровень

Проверено: среди всех 205 админских маршрутов нет ни одного, читающего
диагнозы, назначения, согласия (`consents`) или выписки (`discharge-
documents`) напрямую. Единственный след — `aivita-admin-support.ts:316-318`
читает `medicalCards.cardCode` (код карты, не содержимое) для карточки
пользователя в поддержке.

Настоящие маршруты с медданными (`/v1/aivita/consents`, `/v1/aivita/medical`,
`/v1/aivita/doctor/prescriptions`, `/ecosystem/v1/discharge-documents`)
принадлежат периметру пациента/врача, не админки, и защищены отдельной
авторизацией — они не входят в 205.

Third-tier права заводятся **заранее и не выдаются ни одной роли**:

- `medical:read_phi` — чтение диагнозов/назначений/содержимого согласий, если
  такой маршрут появится в админке (напр. разбор жалобы с доступом к карте).
- `medical:manage_phi` — запись/аннулирование согласий, работа с выписками от
  имени администратора.

Не назначаются в разделе 6 — держатся как расширение на будущее.

---

## 5. Публичные маршруты — белый список (доступ не нужен)

```
POST /v1/auth/login                    — вход в саму панель
POST /api/clinic-demo-request          — заявка с лендинга (см. апрельскую правку)
POST /api/download-log                 — счётчик скачиваний приложения
GET  /api/download/:app                — редирект на APK
```

**Health-эндпоинта не нашлось.** В задании он упомянут как типичный пример
белого списка, но `grep` по `index.ts` не находит ни `/health`, ни
`healthcheck` HTTP-маршрута — есть только Docker `HEALTHCHECK` у контейнера
Postgres. Если он нужен для мониторинга — это отдельная, не входящая сюда
задача завести маршрут, а не вопрос прав.

Всё остальное — по умолчанию закрыто, требует роли из раздела 6.

---

## 6. Восемь ролей

*Оговорка из шапки: набор прав ниже — не выведен из «раздела 3 ТЗ», источник
не найден. Проектировал по названию роли + структуре панели.*

| Роль | Права |
|---|---|
| **Супер-админ** | всё, включая `admins:manage`, `settings:roles`, `medical:*` |
| **Директор** | `main:read`, `users:read/edit`, `aivita:doctors_manage`, `aivita:billing`, `aivita:content`, `partners:read/manage`, `marketing:*`, `content:*`, `security:read`, `reports:generate`, `finance:read/edit/settings`, `system:read`, `settings:team` — **нет** `settings:roles`, `admins:manage`, `system:manage`, `aivita:support*`, `medical:*` |
| **Оператор поддержки** | `aivita:support`, `users:read`, `main:read` |
| **Оператор поддержки (старший)** | + `aivita:support_pii`, `users:edit` |
| **Бухгалтер** | `finance:read/edit/settings`, `reports:generate`, `users:read`, `main:read` |
| **Программист** | `system:read/manage`, `security:read/manage`, `settings:ai`, `main:read`, `reports:generate` — без доступа к финансам и персональным данным пользователей |
| **Маркетолог** | `marketing:*`, `content:*`, `main:read`, `reports:generate` |
| **Продавец MedSoft** | `partners:read/manage`, `content:clinic_requests`, `main:read` — заявки клиник с лендинга это и есть его воронка лидов |
| **Кадры** | `settings:team`, `aivita:doctors_manage` (онбординг врачей как «персонала»), `main:read` |

---

## 7. Сопоставление старых ролей новым

| Старая роль | Источник | Новая роль |
|---|---|---|
| `superadmin` | enum 1.1 | Супер-админ |
| `admin` | enum 1.1 | Директор |
| `viewer` | enum 1.1 | Оператор поддержки |
| `superadmin` | `admin_roles.name` | Супер-админ |
| `admin` | `admin_roles.name` | Директор |
| `moderator` | `admin_roles.name` | Оператор поддержки (старший) — её текущая матрица (`doctors_verify: true`, `finance_read: true`, остальное false) ближе к расширенному оператору, чем к директору |
| `support` | `admin_roles.name` | Оператор поддержки |
| `marketing` | `admin_roles.name` | Маркетолог |
| `finance` | `admin_roles.name` | Бухгалтер |

**Два живых аккаунта на проде** (сверено `admin_users` на 2026-09-01):

- `farhodni@gmail.com`, `role=superadmin`, `is_active=true` → становится
  Супер-админом напрямую, без разрывов.
- `farhodni@mail.ru`, `role=admin`, `is_active=false` → сегодня неактивен, при
  автопереносе стал бы Директором, но поскольку аккаунт выключен — решение
  можно отложить: при реактивации роль назначить заново вручную, не
  полагаясь на автомаппинг «admin → Директор» вслепую.

---

## 8. Где новый словарь НЕ ложится без переделки

Это важнее совпадений — фиксирую прямо:

1. **`admin/users.ts` и `aivita-admin.ts` каждый обслуживают несколько
   разделов сразу.** `admin/users.ts` — это одновременно `settings:roles`,
   `settings:team` и `users:*` (аивита-пользователи) в одном Hono-роутере.
   `aivita-admin.ts` — `users:*`, `aivita:doctors_manage`, `aivita:billing`,
   `aivita:content` вперемешку. Централизованный гейт вида
   `router.use('*', requireX)` (образец — `admins.ts`) тут не сработает —
   нужна гранулярность на уровне групп маршрутов внутри файла, то есть
   реальная переделка структуры роутеров, не только добавление проверок.

2. **`OPERATOR_ROLES` сегодня даёт доступ к поддержке роли `admin`
   (=Директор), а не только `moderator`/`support`.** В новой модели Директор
   в `aivita:support` не входит. Либо снимать `admin` из списка (сузит
   доступ живым Директорам к тикетам), либо сознательно оставить как
   переходный компромисс.

3. **`admin_user_roles` пуста.** Новая модель предполагает реальное
   назначение роли на пользователя через эту таблицу — сегодня её никто не
   заполняет, миграции данных для существующих 2 аккаунтов нет.

4. **`admin_roles.permissions` — несовместимый по форме набор.** 13
   косметических флагов (раздел 2) придётся полностью заменить на ~21+2
   права из разделов 3-4, а не расширить — старые 6 строк в этой таблице
   не мигрируют автоматически, значения нужно переписывать заново под новую
   схему ключей.

5. **`platform-settings.ts` только что закрыт `requireSuperadmin` напрямую**
   (правка этой недели, вне текущей задачи) — жёстко, не через право.
   Целевая модель хочет `finance:settings`, доступное и Директору, и
   Бухгалтеру — значит эту точку придётся переоткрывать заново под новый
   механизм, а не оставлять как есть.

6. **`clinicAdminRouter` смонтирован дважды** — на `/v1/admin/content` и
   `/v1/admin/stats` одним и тем же роутером. Формально это `content:*` и
   что-то похожее на `main:read` (статистика скачиваний) в одном файле —
   тоже нужно разделять по маршрутам, не по монтированию.

7. **Health-маршрута для белого списка нет** (раздел 5) — предположение
   задания не подтвердилось.
