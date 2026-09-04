-- RBAC foundation (docs/rbac-model.md) — step 2 of 3.
-- `rights`: the real right-slug catalog per role (apps/api/src/lib/rbac.ts
-- PERMISSIONS), separate from the legacy `permissions` cosmetic-checkbox
-- column, which stays untouched so settings/roles/page.tsx keeps working
-- unchanged.
ALTER TABLE "admin_roles" ADD COLUMN IF NOT EXISTS "rights" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- Marks stale pre-foundation role rows instead of deleting them (see 0050
-- and the column's own comment in schema/admins.ts) — not reversible on
-- prod, and nothing confirms yet that nothing else reads them.
ALTER TABLE "admin_roles" ADD COLUMN IF NOT EXISTS "is_deprecated" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- `is_senior`: "Оператор поддержки (старший)" is this flag on a
-- support_operator assignment, not a separate role (docs/rbac-model.md §6).
ALTER TABLE "admin_user_roles" ADD COLUMN IF NOT EXISTS "is_senior" boolean DEFAULT false NOT NULL;
