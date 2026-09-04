-- RBAC foundation (docs/rbac-model.md §1, §5, §6) — step 3 of 3.
-- Replaces the free-text admin_roles catalog (6 rows: superadmin, admin,
-- moderator, support, marketing, finance — none assigned to any user,
-- admin_user_roles is empty) with the eight target roles and their right
-- sets from §6, matching apps/api/src/lib/rbac.ts ROLE_RIGHTS exactly.
-- Idempotent: safe to rerun.

-- Flag the five rows that aren't among the eight target roles as
-- deprecated instead of deleting them (superadmin is #6 and IS a target
-- role — updated below, not touched here). admin_user_roles has 0 rows
-- referencing any of admin_roles today (checked 2026-09-01,
-- docs/rbac-model.md §1.3, re-confirmed live via pg_constraint before this
-- migration was written — the only FK anywhere pointing at admin_roles.id
-- is admin_user_roles.role_id) so deleting would cost nothing functionally
-- — but a prod DELETE isn't reversible, and settings/roles/page.tsx (or
-- something unaudited) may still read these rows. Left in place, flagged;
-- removal is a separate later task.
UPDATE "admin_roles" SET "is_deprecated" = true
WHERE "name" IN ('admin', 'moderator', 'support', 'marketing', 'finance');
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('superadmin', 'Супер-администратор', '[
  "main:read","users:read","users:edit","users:delete",
  "aivita:doctors_read","aivita:doctors_manage",
  "aivita:billing_read","aivita:billing_manage",
  "aivita:content_read","aivita:content_manage","aivita:support",
  "partners:read","partners:manage","partners:issue_key",
  "marketing:read","marketing:manage",
  "content:read","content:manage",
  "content:clinic_requests_read","content:clinic_requests_manage",
  "security:read","security:manage","reports:generate",
  "finance:read","finance:edit","finance:prices_manage",
  "finance:settings_read","finance:settings_manage",
  "system:read","system:manage",
  "settings:ai_read","settings:ai_manage",
  "settings:roles_read","settings:roles_manage",
  "settings:team_read","settings:team_manage","admins:manage",
  "pii:reveal","medical:read_phi","medical:manage_phi"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('director', 'Директор', '[
  "main:read","users:read","partners:read","partners:manage",
  "aivita:doctors_read","aivita:billing_read","marketing:read",
  "finance:prices_manage","security:read","reports:generate",
  "finance:read","finance:settings_read","finance:settings_manage"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('support_operator', 'Оператор поддержки', '[
  "aivita:support","users:read","main:read"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('accountant', 'Бухгалтер', '[
  "finance:read","finance:edit","finance:settings_read",
  "reports:generate","users:read","main:read"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('developer', 'Программист', '[
  "system:read","system:manage","security:read","security:manage",
  "settings:ai_read","settings:ai_manage","main:read","reports:generate"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('marketer', 'Маркетолог', '[
  "marketing:read","marketing:manage","content:read","content:manage",
  "finance:prices_manage","main:read","reports:generate"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('medsoft_seller', 'Продавец MedSoft', '[
  "partners:read","partners:manage",
  "content:clinic_requests_read","content:clinic_requests_manage",
  "main:read"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

INSERT INTO "admin_roles" ("name", "display_name", "rights", "is_deprecated") VALUES
('hr', 'Кадры', '[
  "settings:team_read","settings:team_manage","main:read"
]'::jsonb, false)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = excluded."display_name",
  "rights" = excluded."rights",
  "is_deprecated" = false;
--> statement-breakpoint

-- Data migration (docs/rbac-model.md §5, §7): farhodni@gmail.com -> superadmin.
-- The second live account (farhodni@mail.ru, role=admin, is_active=false) is
-- deliberately NOT touched here — reactivation-time manual assignment, per
-- the document. WHERE NOT EXISTS instead of ON CONFLICT: admin_user_roles
-- has no unique constraint on (user_id, role_id) to target.
INSERT INTO "admin_user_roles" ("user_id", "role_id")
SELECT au."id", ar."id"
FROM "admin_users" au, "admin_roles" ar
WHERE au."email" = 'farhodni@gmail.com' AND ar."name" = 'superadmin'
  AND NOT EXISTS (
    SELECT 1 FROM "admin_user_roles" x
    WHERE x."user_id" = au."id" AND x."role_id" = ar."id"
  );
