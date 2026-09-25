# Деплой лендинга (aivita.uz)

Прод — обычная папка `/var/www/aivita-landing` на VPS, которую отдаёт
системный nginx напрямую (`root /var/www/aivita-landing;`). Это НЕ
Coolify-приложение и не покрыто нативным Coolify-вебхуком — деплоится
только через `.github/workflows/deploy-landing.yml`.

## Как выкатить

- **Автоматически**: любой пуш в `main`, затрагивающий `apps/landing/**`.
- **Вручную**: вкладка Actions → "Deploy Landing (aivita.uz)" → Run workflow.
  По умолчанию `dry_run=true` (только показывает, что изменится, ничего
  не копирует) — поставьте `false`, чтобы реально выкатить.

Секрет `VPS_HOST` тот же, что у `deploy-coolify.yml`. SSH-ключ — свой,
`LANDING_SSH_KEY`: `COOLIFY_SSH_KEY` для этого не подошёл — он сам
заужен только под port-forward (`command="exit ..."` в authorized_keys),
`rsync` через него выполнить нельзя. `LANDING_SSH_KEY` в authorized_keys
на VPS заужен симметрично, но под свою задачу:

```
command="/usr/bin/rrsync -wo -no-del /var/www/aivita-landing/",no-pty,no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-user-rc ssh-ed25519 <...> landing-rsync-only
```

Этим ключом нельзя выполнить ничего, кроме `rsync`-записи именно в эту
папку (проверено: произвольная команда и попытка синка в другую
директорию — обе отклоняются; `rrsync` трактует любой путь назначения
как путь ВНУТРИ уже зафиксированной папки, выйти за её пределы нечем).

## Что исключено из синка и почему

Синк идёт через `rsync` **без `--delete`** — файлы, которых нет в
репозитории, никогда не удаляются, что бы ни было в списке исключений
ниже. Список существует для (а) явной защиты критичных файлов вроде APK
и (б) документирования, почему некоторые файлы из репозитория
намеренно не попадают на прод.

| Что | Где живёт | Почему исключено |
|---|---|---|
| `downloads/*.apk` | только на сервере | APK не хранятся в git (сняты с отслеживания 2026-09-24, до этого в гите лежал patient 1.3.8 при 1.3.24 на проде). Исключение — страховка от случайного `git add -f`. См. пункт «APK» ниже. |
| `*.bak*` (index.html.bak, logo\*.png.bak, get-app.html.bak, и т.п.) | нигде (удалены 2026-09-24) | Ручные снапшоты за май–сентябрь, в гите их никогда не было. Исключение оставлено как страховка от случайного коммита. |
| `6e3a3321e0a7ac487e75f14c6909ebf9.txt` | только на сервере | Файл верификации домена, добавлен вручную 11 июля, в гите не отслеживается. |
| `api/*.js` (landing-config.js, waitlist.js) | нигде (удалены 2026-09-24) | Остатки старой Vercel-архитектуры. nginx их не использовал — `/api/*` идёт напрямую на бэкенд/Next.js. |
| `package.json`, `vercel.json`, `nginx.conf` | нигде (удалены 2026-09-24) | Vercel/Docker-эпоха. `apps/landing/nginx.conf` удалён и из репозитория вместе с мёртвым сервисом `landing` в корневом `docker-compose.yml`. |
| `.env.example`, `.gitignore`, `CLAUDE.md`, `README.md` | нигде (удалены 2026-09-24) | Служебные файлы исходного скаффолда; отдавались наружу как обычная статика. |

Бэкап всей папки перед уборкой 2026-09-24: `/root/backups/aivita-landing-20260924-1415.tar.gz`.

## APK

`downloads/aivita-patient.apk` и `downloads/aivita-doctor.apk` живут
**только на сервере**, в git их нет. Новый APK выкладывается напрямую
на VPS через `scp`, минуя git и этот воркфлоу — порядок действий в
[`docs/apk-release.md`](../../docs/apk-release.md).

## Кэш

`/assets/*` отдаётся с `expires 1y; Cache-Control: public, immutable`
(см. `/etc/nginx/sites-enabled/aivita.uz` на VPS). Перед синком воркфлоу
прогоняет `.github/scripts/cache_bust_assets.py`, который дописывает
`?v=<короткий SHA коммита>` ко всем ссылкам на `/assets/...` (в HTML и
`manifest.webmanifest`, включая абсолютные `https://aivita.uz/assets/...`
в og:image). `/downloads/...` и внешние домены не трогаются.
