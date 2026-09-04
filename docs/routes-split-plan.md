# План разделения роутеров под RBAC — раскладка без прав

Основание: [docs/rbac-model.md](./rbac-model.md) (ветка `docs/rbac-model`, коммит `7246469`),
раздел «Главный вывод» + раздел 3. Права НЕ включаются этим планом — только физическая
раскладка файлов, чтобы право можно было потом навесить одной строкой на файл.

**Жёсткое требование:** ни один внешний адрес не меняется. Достигается тем, что каждый
новый файл монтируется в `index.ts` на ТОТ ЖЕ префикс, что и раньше — просто несколькими
`app.route()` вызовами на один префикс вместо одного. Hono это поддерживает: маршруты
разных под-роутеров на одном префиксе не конфликтуют, пока не совпадают по пути.

## 1. `routes/clinic-requests.ts` (3 admin-маршрута, монтирован дважды)

Публичная часть (`clinicPublicRouter`, mount `/api`) не трогается — вне периметра прав.

Админ-часть сегодня смонтирована ДВАЖДY одним и тем же роутером — на `/v1/admin/content`
и на `/v1/admin/stats` (`index.ts:227-228`). Значит каждый её маршрут физически отвечает
на обоих префиксах уже сегодня. Чтобы не поменять ни одного адреса, разделение сохраняет
это же двойное монтирование для ОБОИХ новых файлов:

- `clinic-requests.ts` (остаётся) — `clinicAdminRouter` ужимается до 2 маршрутов
  (`GET/PUT /clinic-requests/:id?`) — право `content:clinic_requests_read/manage`.
- `download-stats.ts` (новый) — `downloadStatsRouter`, 1 маршрут (`GET /stats/downloads`)
  — право `main:read`.

`index.ts`: было 2 строки монтирования, станет 4 — оба новых роутера каждый на оба префикса:
```
app.route('/v1/admin/content', clinicAdminRouter);
app.route('/v1/admin/stats',   clinicAdminRouter);
app.route('/v1/admin/content', downloadStatsRouter);
app.route('/v1/admin/stats',   downloadStatsRouter);
```

## 2. `routes/admin/users.ts` (13 маршрутов)

⚠ Фактический состав в коде расходится с таблицей в rbac-model.md (там: roles 4 + team 3 +
users 6; по факту: roles 4 + team **2** + `doctors/:id/verify` **1** (не упомянут отдельно
в документе) + users 6). Итог 13 совпадает, но `doctors/:id/verify` физически не входит ни
в одну из трёх названных документом групп — выносится в отдельный файл-маркер, право не
присваивается этим планом, решение о её судьбе (см. отчёт) — за Фарходом.

Новые файлы, все монтируются на тот же префикс `/v1/admin/users`:
- `admin/users-roles.ts` — `usersRolesRouter`, 4 маршрута — `settings:roles_read/manage`
- `admin/users-team.ts` — `usersTeamRouter`, 2 маршрута — `settings:team_read/manage`
- `admin/users-doctor-verify.ts` — `usersDoctorVerifyRouter`, 1 маршрут (`PUT
  /doctors/:id/verify`) — право НЕ определено, см. находку о дублировании в отчёте
- `admin/users.ts` (остаётся, ужимается) — `adminUsersRouter`, 6 маршрутов (CRUD) —
  `users:read/edit/delete`

## 3. `routes/aivita-admin.ts` (22 маршрута)

Четыре файла по существующей в репозитории конвенции именования (рядом уже есть
`aivita-admin-support.ts`), все монтируются на тот же префикс `/v1/aivita-admin`:
- `aivita-admin-users.ts` — 10 маршрутов — `users:read/edit/delete`
- `aivita-admin-doctors.ts` — 5 маршрутов — `aivita:doctors_read/manage`
- `aivita-admin-billing.ts` — 5 маршрутов — `aivita:billing_read/manage`
- `aivita-admin-home-settings.ts` — 2 маршрута — `aivita:content_read/manage`

## Порядок выполнения

Начинаем с `clinic-requests.ts` (самый маленький), затем `admin/users.ts`, затем
`aivita-admin.ts`. После каждого файла — сборка, `tsc`, сверка списка маршрутов с
`route-inventory-before.md` один в один. Права не навешиваются ни на одном шаге. Каждый
файл — отдельный коммит.
