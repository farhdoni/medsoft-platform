# Дублирование в панели — два живых входа к одному ресурсу

Найдено при разведке `docs/rbac-model.md` / разделении роутеров (2026-09-04). Оба случая —
**не мёртвый код**: проверено по фронту, каждая сторона вызывается с реального экрана панели,
одновременно. Ничего не удаляется и не объединяется этим документом — решение и объединение
отдельной задачей, с проверкой обоих экранов. Здесь только описание.

## 1. CRUD пользователей AIVITA — два файла, две пары экранов

Один и тот же ресурс (таблица `aivitaUsers`) администрируется из двух разных бэкенд-файлов,
и у панели есть две отдельные пары списочных экранов поверх них:

| Бэкенд | Экраны панели, которые его вызывают |
|---|---|
| `admin/users.ts` → `/v1/admin/users/*` | `users/doctors`, `users/doctors/[id]`, `users/patients`, `users/patients/[id]` |
| `aivita-admin-users.ts` → `/v1/aivita-admin/users/*` | `patients`, `patients/[id]`, `patients/[id]/chat` |

Поведение расходится, не просто разные URL на одну и ту же операцию:

- **Блокировка.** `admin/users.ts` `PUT /:id` / `POST /:id/block` — через `lockedUntil`
  (+10 лет от текущего момента). `aivita-admin-users.ts` `PATCH /users/:id` — через
  `deletedAt` (деактивация), другое поле, другой физический эффект в БД.
- **Редактируемые поля.** `admin/users.ts` меняет `tier`(→`plan`)/`status`. У
  `aivita-admin-users.ts` — `deletedAt`/`name`. Ни одно поле не пересекается.
  `users/doctors/[id]/page.tsx:186` шлёт ещё и `showInCatalog` в `PUT /v1/admin/users/:id`
  — схема валидации этого маршрута (`z.object({tier,status})` без `.strict()`/`.passthrough()`)
  молча отбрасывает незнакомые поля. Похоже на нерабочую кнопку с этого экрана, не проверял
  глубже — вне рамок обеих задач, просто фиксирую рядом.
- **Удаление.** Оба ставят `deletedAt` (soft delete) — здесь поведение СОВПАДАЕТ, но
  `aivita-admin-users.ts`'s `DELETE /users/:id` дополнительно проверяет `isNull(deletedAt)`
  и возвращает 404, если уже удалён; `admin/users.ts`'s `DELETE /:id` ставит `deletedAt`
  безусловно, повторный вызов не даёт ошибки.
- **Уникальное каждой стороне.** Только `admin/users.ts`: `reset-password`. Только
  `aivita-admin-users.ts`: `export` (GDPR), `chat`, `subscription` (get/assign),
  `verify-email`, `dashboard`.

## 2. Подтверждение врача — два эндпоинта, разный побочный эффект

| Эндпоинт | Вызывается с | При approve делает |
|---|---|---|
| `PUT /v1/admin/users/doctors/:id/verify` (`users-doctor-verify.ts`) | `users/doctors/[id]` | `doctorProfiles.verificationStatus='verified'` **и** `aivitaUsers.role='doctor'` |
| `PATCH /v1/aivita-admin/aivita-doctors/:id/verify` (`aivita-admin-doctors.ts`) | `aivita/doctors`, `aivita/doctors/[id]` | `doctorProfiles.verificationStatus='verified'` **и** `showInCatalog`/`isActive=true` (если не был уже verified) |

Не альтернативные пути к одному результату — каждый меняет что-то, что другой не трогает.
Если админ подтверждает врача через один экран, а не через другой, часть эффекта (роль
пользователя ИЛИ видимость в каталоге) не применяется. На отклонении расхождение меньше:
первый пишет только `rejectionReason`, второй дополнительно гасит `showInCatalog:false`.

**Право и физическое место (решено 2026-09-04):** `PUT /v1/admin/users/doctors/:id/verify`
логически принадлежит разделу «Врачи» и несёт право `aivita:doctors_manage` (оно уже есть в
модели, раздел 3 `rbac-model.md`) — не `users:*`, хотя физически файл остаётся в
`routes/admin/users-doctor-verify.ts` рядом с остальным `admin/users.ts`, потому что
перенос в `aivita-admin-doctors.ts` изменил бы внешний адрес (`/v1/admin/users/...` →
`/v1/aivita-admin/...`), а адреса менять нельзя. Физическое место и логическая
принадлежность права расходятся сознательно — держать в уме при разделении прав по файлу:
для `users-doctor-verify.ts` правило «один файл — одна строка права» даёт право не своего
раздела (`aivita:doctors_manage`, а не `settings:*`/`users:*`, которые несут остальные три
файла на этом же префиксе).

## 3. Известное, третьим экземпляром (не переоткрываю)

`subscriptionPlans` пишется из `aivita-admin-billing.ts` (`aivita:billing_manage`) и
`admin/finance.ts` (`finance:prices_manage`) — см. `rbac-model.md`, сноска⁴. Тот же класс
проблемы, что и пп. 1-2 выше, найден раньше и документом уже учтён.
