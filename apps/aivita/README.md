# aivita.uz — Health Platform

Единое веб-приложение: маркетинговый лендинг + личный кабинет пациента + PWA.

## Быстрый старт (локально)

```bash
# Из корня монорепо
pnpm install
pnpm --filter aivita dev
# → http://localhost:3001
```

## Архитектура

```
app/[locale]/
  (marketing)/     # Для гостей: лендинг, privacy, terms, offline
  (auth)/          # Auth flow: sign-in, onboarding (4 экрана)
  (app)/           # Личный кабинет: home, profile, chat, ...
```

**Route groups:**
- `(marketing)` — SSR, SEO-оптимизировано, нет auth
- `(auth)` — знак входа + онбординг
- `(app)` — защищено auth-guard в `layout.tsx`

**Middleware** (`middleware.ts`):
- Гость + корень → отдаёт лендинг
- Залогинен + корень → `/home`
- Залогинен + `/sign-in` → `/home`
- Не залогинен + `/home|/chat|...` → `/sign-in`

## Аутентификация

**Сейчас: mock-режим.** Кнопка «Войти (демо-режим)» создаёт сессию через server action и устанавливает cookie `aivita_session` (base64 JSON, 7 дней).

### Переключение на реальный OAuth

1. Добавить в `.env.local`:
```
NEXTAUTH_URL=https://aivita.uz
NEXTAUTH_SECRET=<random 32 chars>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

2. Установить Auth.js: `pnpm add next-auth@beta`
3. Создать `app/api/auth/[...nextauth]/route.ts`
4. Заменить `lib/auth/session.ts` на вызовы `auth()` из Auth.js
5. Uncomment OAuth providers в конфиге

## PWA

- `app/manifest.ts` — Web App Manifest
- `public/sw.js` — Service Worker (cache-first)
- `public/icons/icon.svg` — базовая иконка (нужно сгенерировать PNG)

### Генерация PNG иконок

```bash
# Из корня aivita
npx @squoosh/cli --oxipng '{}' public/icons/icon.svg
# Или используй любой конвертер SVG→PNG для всех размеров:
# 72, 96, 128, 144, 152, 192, 384, 512px → public/icons/icon-{size}.png
```

## База данных

Новые таблицы в `packages/db/src/schema/aivita.ts` (15 таблиц):

| Таблица | Описание |
|---------|----------|
| `aivita_users` | Пользователи приложения |
| `health_profiles` | Паспорт здоровья (1:1 с users) |
| `chronic_conditions` | Хронические заболевания |
| `allergies` | Аллергии |
| `medical_history` | История болезней/операций |
| `medications` | Текущие лекарства |
| `vitals` | Биометрия (пульс, давление, сон, шаги) |
| `habits` + `habit_logs` | Привычки и ежедневные логи |
| `meals` | Дневник питания |
| `health_scores` | История Health Score |
| `system_test_results` | Результаты теста 5 систем |
| `family_members` | Семейный аккаунт |
| `chat_sessions` + `chat_messages` | AI-чат |
| `notifications` | Уведомления |
| `doctor_reports` | PDF-отчёты для врача |

### Применить миграцию

```bash
pnpm --filter @medsoft/db db:generate
pnpm --filter @medsoft/db db:migrate
```

## API

API endpoints для aivita планируются в `apps/api/src/routes/aivita/`.

Сейчас все данные — mock (hardcoded в компонентах). Подключение к реальному API — Task 7 (не реализован в MVP1).

## Capacitor (iOS/Android)

Конфиг подготовлен в `capacitor.config.ts` (нужно создать):

```bash
# TODO: добавить Capacitor
pnpm add @capacitor/core @capacitor/cli
npx cap init aivita uz.aivita.app

# После настройки iOS/Android SDK:
npx cap add ios
npx cap add android
npx cap sync
```

## Деплой

```bash
# Docker (standalone mode)
docker build -f apps/aivita/Dockerfile -t aivita .
docker run -p 3000:3000 aivita
```

Coolify auto-deploys при пуше в `main` ветку через webhook.

## Env переменные

| Переменная | Описание | Где взять |
|-----------|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL API сервера | `https://api.aivita.uz` или Coolify env |
| `ANTHROPIC_API_KEY` | Ключ Claude API | console.anthropic.com |
| `NEXTAUTH_SECRET` | Секрет для JWT | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | OAuth Google | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | OAuth Google | console.cloud.google.com |
| `DATABASE_URL` | PostgreSQL URL | Coolify env (уже настроен) |

## TODO для ручных действий

- [ ] Сгенерировать PNG иконки из `public/icons/icon.svg` (все размеры)
- [ ] Создать `public/og/home.png` (1200×630) для социальных сетей
- [ ] Настроить реальные OAuth credentials (Google, Apple, Telegram)
- [ ] Применить DB миграцию на продакшен сервере
- [ ] Добавить `ANTHROPIC_API_KEY` в Coolify env vars
- [ ] Запустить Capacitor для iOS/Android (нужен macOS + Xcode)
- [ ] Настроить `app.aivita.uz` как 301 redirect в Coolify

## Скрины (33 экрана)

| Группа | Экраны |
|--------|--------|
| Auth | `/sign-in`, `/sign-in/success` |
| Onboarding | `/onboarding/welcome`, `/age`, `/anamnesis`, `/result` |
| Главная | `/home`, `/profile` |
| Тест 5 систем | `/test`, `/test/[id]`, `/test/results` |
| AI-чат | `/chat` |
| Привычки | `/habits` |
| Питание | `/nutrition` |
| Семья | `/family` |
| Отчёт врачу | `/report` |
| Настройки | `/settings` |
| Уведомления | `/notifications` |
| PWA Install | `/install` |
