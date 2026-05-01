# Аудит приложения aivita
**Дата:** 2026-05-01  
**URL:** https://aivita.uz  
**Стек:** Next.js 15.3.1 / App Router, next-intl, @anthropic-ai/sdk 0.91.1  
**Backend:** Hono.js API → api.aivita.uz / PostgreSQL / Redis  
**Режим сборки:** `output: standalone`, TypeScript и ESLint ошибки игнорируются при сборке

---

## Сводка

| Категория | Статус | Комментарий |
|-----------|--------|-------------|
| Сайт доступен | РАБОТАЕТ | aivita.uz → 200 OK (с redirect /ru) |
| Авторизация (демо) | РАБОТАЕТ | mockSignIn создаёт реального пользователя в БД |
| AI-чат (/api/ai/chat) | РАБОТАЕТ | Claude claude-haiku-4-5, SSE streaming |
| Backend API (api.aivita.uz) | РАБОТАЕТ | 401 без сессии — правильное поведение |
| Реальные данные в кабинете | НЕ РАБОТАЕТ | 7 из 9 экранов кабинета — 100% моковые данные |
| Связь кабинета с API | ЧАСТИЧНО | Только home/page.tsx использует api-client |
| Безопасность сессии | УЯЗВИМО | Base64 без подписи — сессию можно подделать |
| Google OAuth | НЕ РАБОТАЕТ | Кнопка ведёт на mockSignIn, не на OAuth |
| Онбординг | ЧАСТИЧНО | Данные не сохраняются в профиль |
| i18n (uz, en) | ЧАСТИЧНО | Переводы только в marketing, кабинет только ru |

---

## КРИТИЧНЫЕ проблемы

### 1. Сессия — Base64 без криптографической подписи (УЯЗВИМОСТЬ)
**Файлы:** `apps/aivita/lib/auth/session.ts:19`, `apps/api/src/middleware/aivita-auth.ts:21-28`

Сессия хранится как `base64(JSON)` — без HMAC, без JWT, без подписи.  
Любой пользователь может закодировать произвольный `userId` в base64 и получить доступ к любому аккаунту:
```
echo '{"userId":"другой-user-id","email":"x@x.com","name":"x","onboardingCompleted":true}' | base64
```
Итог: нет аутентификации — есть только obscurity.

**Строки кода — бэкенд:**
```ts
// apps/api/src/middleware/aivita-auth.ts:21-28
const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
const session = JSON.parse(decoded) as AivitaSession;
if (!session.userId) return c.json({ error: 'Invalid session' }, 401);
// userId принимается без проверки подлинности!
```

---

### 2. Google OAuth — не реализован, кнопка ведёт на mock
**Файл:** `apps/aivita/app/[locale]/(auth)/sign-in/page.tsx:39-43`

Обе формы — "Войти через Google" и "Войти (демо-режим)" — вызывают `mockSignIn(locale)` с хардкоженными данными:
```ts
// apps/aivita/app/[locale]/(auth)/sign-in/actions.ts:27-28
const name = 'Азиз';
const email = 'demo@aivita.uz';
```
Нет никакого OAuth flow. Все пользователи логинятся как один и тот же demo-аккаунт.

---

### 3. Онбординг не сохраняет введённые данные
**Файлы:** `app/[locale]/(auth)/onboarding/age/page.tsx`, `anamnesis/page.tsx`, `result/page.tsx`

Возраст, заболевания, выбранные чекбоксы — нигде не передаются в API.  
`result/actions.ts` вызывает `completeOnboarding` — только устанавливает флаг `onboardingCompleted: true`.  
Результат: Health Score на экране onboarding/result всегда показывает хардкоженные `72` и `36 лет`:
```tsx
// apps/aivita/app/[locale]/(auth)/onboarding/result/page.tsx:28
<HealthScoreCircle score={72} size={160} animate={true} strokeWidth={8} />
```

---

### 4. TypeScript и ESLint полностью отключены при сборке
**Файл:** `apps/aivita/next.config.ts:8-9`
```ts
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```
Это позволяет скрытым ошибкам типов попасть в production.

---

### 5. ANTHROPIC_API_KEY — отсутствует в .env.example
**Файл:** `apps/aivita/app/api/ai/chat/route.ts:23-26`

Ключ `ANTHROPIC_API_KEY` используется в chat route, но не указан в `.env.example`.  
Судя по факту что API возвращает реальный streaming-ответ — ключ есть в production env.  
Однако при падении ключа или отсутствии — возвращается mock без уведомления клиента (`"mock": true` только в JSON-ответе, не в streaming).

**Фактический тест chat API (2026-05-01):**
```
POST https://aivita.uz/api/ai/chat → Streaming SSE (реальный Anthropic)
Вопрос: "Привет, как улучшить сон?" → Ответ получен (claude-haiku-4-5)
```

---

## Важные проблемы

### 6. 7 из 9 экранов кабинета — полностью моковые, без подключения к API

| Экран | Файл | Тип данных |
|-------|------|------------|
| /habits | `habits/page.tsx:16-22` | `const INITIAL_HABITS = [...]` — хардкод |
| /nutrition | `nutrition/page.tsx:18-24` | `const MOCK_MEALS = [...]` — хардкод |
| /profile | `profile/page.tsx:5-18` | `MOCK_ALLERGIES`, `MOCK_CHRONIC`, `MOCK_HISTORY` — хардкод, имя "Азиз Каримов" |
| /notifications | `notifications/page.tsx:12-46` | `const NOTIFICATIONS = [...]` — хардкод |
| /test | `test/page.tsx:6-51` | `const SYSTEMS = [...]` — хардкод (score 82, 68, 59, null, null) |
| /test/results | `test/results/page.tsx:7-11` | `const SYSTEMS = [...]` — хардкод |
| /report | `report/page.tsx:5-6` | `reportNumber = '4291-АК'`, `createdDate = '29 апреля 2026'` — хардкод |
| /family | `family/page.tsx:4-24` | `const FAMILY_MEMBERS = [...]` — хардкод |
| /test/[systemId] | `test/[systemId]/page.tsx` | Вопросы и системы — хардкод, `systemId` из URL не используется |

Бэкенд API для всего этого **существует** (`habits`, `nutrition`, `health-score`, `notifications`, `reports`, `family`) — но к нему не обращаются. Подключён только `/home` через `api.healthScore.latest()`.

---

### 7. Метрики на /home — частично хардкод
**Файл:** `apps/aivita/app/[locale]/(app)/home/page.tsx:124-149`

- Health Score подтягивается из API (строки 12-31) — правильно
- `displayScore = healthScore ?? 72` — fallback 72 при отсутствии данных
- Пульс `72 bpm` — строка 124, полный хардкод
- Вода `1.4 / 2.5л` — строка 133, полный хардкод
- Шаги `8.2K` — строка 141, полный хардкод
- График активности `[60, 75, 68, 82, 70, 87, 90]` — строка 176, полный хардкод

---

### 8. Кнопки "Добавить" — не функциональны
В `habits/page.tsx:123`, `nutrition/page.tsx:127`, `family/page.tsx:84` — кнопки "+" без `onClick`, без перехода на форму создания. Нажатие ничего не делает.

---

### 9. Настройки — почти все пункты ведут на `href="#"`
**Файл:** `apps/aivita/app/[locale]/(app)/settings/page.tsx:12-27`

Все пункты ("Цели здоровья", "Язык", "Push-уведомления", "Мои данные") имеют `href: '#'` — страницы не реализованы.

---

### 10. Кнопки в /report не функциональны
**Файл:** `apps/aivita/app/[locale]/(app)/report/page.tsx:81-98`

"Поделиться", "Скопировать ссылку", "Скачать PDF", "Распечатать", "Показать QR" — все `<button>` без `onClick` обработчиков.

---

### 11. Тест /test/[systemId] показывает только "Психо и стресс"
**Файл:** `apps/aivita/app/[locale]/(app)/test/[systemId]/page.tsx:95`

Заголовок и вопросы хардкоженны под "ПСИХО И СТРЕСС" — параметр `systemId` из URL вообще не читается (переменная `params` объявлена, но не используется через `await`). Все 5 систем показывают одинаковый тест.

---

## Косметические проблемы

### 12. Двойной meta mobile-web-app-capable
**Файл:** `apps/aivita/app/layout.tsx:30,31` — дублируется через `appleWebApp` и `other`.

### 13. Функция Sign-in/success ведёт на `./welcome` relative URL
**Файл:** `apps/aivita/app/[locale]/(auth)/sign-in/success/page.tsx` — ссылка `href="./welcome"` может сломаться при изменении структуры.

### 14. aivita версия v0.1.0 · demo build видна пользователям
**Файл:** `apps/aivita/app/[locale]/(app)/settings/page.tsx:100`.

### 15. Чат: AppHeader получает хардкоженное name="AI-помощник"
**Файл:** `apps/aivita/app/[locale]/(app)/chat/page.tsx:166` — не подтягивает имя реального пользователя.

---

## Что работает

| Функция | Детали |
|---------|--------|
| Сайт открывается | 200 OK, редирект /→/ru работает |
| Маркетинговая страница | `/ru` — полноценная лендинг-страница |
| Авторизация (демо-режим) | `mockSignIn` → создаёт пользователя в БД → устанавливает сессию |
| Middleware auth-guard | Защищённые роуты `/home`, `/chat`, etc. редиректят на `/sign-in` |
| AI-чат | Claude claude-haiku-4-5 через SSE streaming работает в production |
| Fallback в chat API | При отсутствии ключа — mock-ответы по ключевым словам |
| Health Score на /home | Подтягивается из `api.aivita.uz/v1/aivita/health-score` |
| Уведомления на /home | Подтягиваются из API (`hasNotifications`) |
| Онбординг (UX) | Флоу welcome→age→anamnesis→result работает визуально |
| Тест системы (UX) | Слайдер работает, calculates score, показывает результат |
| Мультиязычность (partial) | ru/uz/en маршрутизация через next-intl |
| PWA | manifest.webmanifest, service worker, installable |
| Backend API (все эндпоинты) | habits, nutrition, health-score, reports, chat, family — реализованы |

---

## Детальная карта экранов

| Маршрут | Файл | Статус | Данные |
|---------|------|--------|--------|
| / | `app/page.tsx` | РАБОТАЕТ (redirect /ru) | — |
| /ru | `[locale]/(marketing)/page.tsx` | РАБОТАЕТ | Статика |
| /ru/sign-in | `(auth)/sign-in/page.tsx` | РАБОТАЕТ (демо) | Mock: "Азиз" / demo@aivita.uz |
| /ru/sign-in/success | `(auth)/sign-in/success/page.tsx` | РАБОТАЕТ | Статика |
| /ru/onboarding/welcome | `(auth)/onboarding/welcome/page.tsx` | РАБОТАЕТ | Статика |
| /ru/onboarding/age | `(auth)/onboarding/age/page.tsx` | РАБОТАЕТ (UI) | Выбор не сохраняется |
| /ru/onboarding/anamnesis | `(auth)/onboarding/anamnesis/page.tsx` | РАБОТАЕТ (UI) | Выбор не сохраняется |
| /ru/onboarding/result | `(auth)/onboarding/result/page.tsx` | ЧАСТИЧНО | Score=72 хардкод |
| /ru/home | `(app)/home/page.tsx` | РАБОТАЕТ | Health Score из API, остальное хардкод |
| /ru/chat | `(app)/chat/page.tsx` | РАБОТАЕТ | Реальный Anthropic claude-haiku-4-5 |
| /ru/habits | `(app)/habits/page.tsx` | СЛОМАНО | 100% хардкод, не читает API |
| /ru/nutrition | `(app)/nutrition/page.tsx` | СЛОМАНО | 100% хардкод, не читает API |
| /ru/profile | `(app)/profile/page.tsx` | СЛОМАНО | "Азиз Каримов", хардкод аллергий/истории |
| /ru/test | `(app)/test/page.tsx` | СЛОМАНО | Score 82/68/59 хардкод |
| /ru/test/[systemId] | `(app)/test/[systemId]/page.tsx` | СЛОМАНО | systemId не используется |
| /ru/test/results | `(app)/test/results/page.tsx` | СЛОМАНО | Все 5 систем хардкод |
| /ru/notifications | `(app)/notifications/page.tsx` | СЛОМАНО | 4 уведомления хардкод |
| /ru/report | `(app)/report/page.tsx` | СЛОМАНО | "Азиз Каримов", № 4291-АК хардкод |
| /ru/settings | `(app)/settings/page.tsx` | ЧАСТИЧНО | Sign-out работает, остальное href=# |
| /ru/family | `(app)/family/page.tsx` | СЛОМАНО | 2 члена семьи хардкод |
| /ru/install | `(app)/install/page.tsx` | РАБОТАЕТ | PWA install guide |
| /ru/coming-soon | `(marketing)/coming-soon/page.tsx` | РАБОТАЕТ | Статика |
| /ru/terms | `(marketing)/terms/page.tsx` | РАБОТАЕТ | Статика |
| /ru/privacy | `(marketing)/privacy/page.tsx` | РАБОТАЕТ | Статика |
| /ru/offline | `(marketing)/offline/page.tsx` | РАБОТАЕТ | PWA offline page |

---

## Карта API endpoints

### Frontend Next.js API (`aivita.uz/api/`)

| Endpoint | Метод | HTTP | Статус |
|----------|-------|------|--------|
| /api/ai/chat | POST | 200 (SSE) | РАБОТАЕТ — реальный Claude |
| /api/health | GET | 404 | НЕ РЕАЛИЗОВАН |

### Backend API (`api.aivita.uz/v1/aivita/`)

| Endpoint | Метод | HTTP (без сессии) | Статус |
|----------|-------|-------------------|--------|
| /auth/mock-sign-in | POST | 200 | РАБОТАЕТ |
| /auth/me | GET | 401 | РАБОТАЕТ |
| /auth/sign-out | POST | 401 | РАБОТАЕТ |
| /auth/complete-onboarding | POST | 401 | РАБОТАЕТ |
| /health-score | GET | 401 | РАБОТАЕТ (endpoint exists) |
| /health-score/history | GET | 401 | РАБОТАЕТ |
| /health-score/calculate | POST | 401 | РАБОТАЕТ |
| /health-score/vitals | GET | 401 | РАБОТАЕТ |
| /habits | GET | 401 | РАБОТАЕТ (не подключён к UI) |
| /habits | POST | 401 | РАБОТАЕТ (не подключён к UI) |
| /nutrition | GET | 401 | РАБОТАЕТ (не подключён к UI) |
| /nutrition | POST | 401 | РАБОТАЕТ (не подключён к UI) |
| /nutrition/summary | GET | 401 | РАБОТАЕТ (не подключён к UI) |
| /chat/sessions | GET | 401 | РАБОТАЕТ (не подключён к UI) |
| /notifications | GET | 401 | РАБОТАЕТ (не подключён к UI) |
| /notifications/read-all | POST | 401 | РАБОТАЕТ (не подключён к UI) |
| /reports | GET | 401 | РАБОТАЕТ (не подключён к UI) |
| /reports/generate | POST | 401 | РАБОТАЕТ (не подключён к UI) |
| /users | GET | 401 | РАБОТАЕТ (не подключён к UI) |
| /family | GET | 401 | РАБОТАЕТ (не подключён к UI) |

**Примечание:** 401 без сессии — корректное поведение. Все endpoints существуют на сервере.

---

## Порядок починки

### Этап 1 — Безопасность (критично, ~1-2 дня)
- Заменить base64-сессию на signed JWT (HS256 или RS256)
  - **Файлы:** `apps/aivita/lib/auth/session.ts`, `apps/api/src/middleware/aivita-auth.ts`
- Добавить `ANTHROPIC_API_KEY` в `.env.example`

### Этап 2 — Реальная авторизация (1-3 дня)
- Реализовать Google OAuth (NextAuth.js или Lucia)
  - Убрать хардкод `name='Азиз'`, `email='demo@aivita.uz'` из `sign-in/actions.ts`
- Сохранять данные онбординга в API (возраст, заболевания)
  - **Файлы:** `onboarding/age/page.tsx`, `onboarding/anamnesis/page.tsx`, `onboarding/result/actions.ts`

### Этап 3 — Подключение кабинета к API (3-5 дней)
Приоритет: habits → nutrition → profile → notifications → test

Для каждого экрана:
1. Убрать `const MOCK_*` / `const INITIAL_*`
2. В server components — добавить `api.XXX.list(sessionCookie)` через `getHomeData`-паттерн
3. В client components — добавить `useEffect` + `fetch` или TanStack Query (уже в deps)

**Файлы для изменений:**
- `habits/page.tsx` → `api.habits.list(cookie)`
- `nutrition/page.tsx` → `api.nutrition.list(cookie)`, `api.nutrition.summary(cookie)`
- `profile/page.tsx` → `api.users.me(cookie)` + `api.healthScore.latest(cookie)`
- `notifications/page.tsx` → `api.notifications.list(cookie)`
- `report/page.tsx` → `api.reports.generate(cookie)`
- `family/page.tsx` → GET `/family` endpoint

### Этап 4 — Функциональность кабинета (2-4 дня)
- Реализовать формы добавления (привычки, питание, члены семьи)
- Исправить `/test/[systemId]` — читать `systemId`, показывать правильные вопросы
- Сохранять результаты теста в `systemTestResults` через `health-score/calculate`
- Подключить /home метрики (пульс, вода, шаги) к API vitals

### Этап 5 — Настройки и экспорт (1-2 дня)
- Реализовать страницы настроек (вместо `href='#'`)
- Реализовать кнопки /report: PDF-генерация, QR-код, шаринг

### Этап 6 — Качество (1 день)
- Включить TypeScript проверки: убрать `ignoreBuildErrors: true`
- Включить ESLint при сборке

**Итого оценка:** ~10-17 рабочих дней до полноценного MVP с реальными данными.
