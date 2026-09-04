-- RBAC foundation (docs/rbac-model.md §1, §6/§7) — step 1 of 3.
-- Adds the eight target role values to admin_role. 'admin' and 'viewer'
-- (existing values) are NOT removed — the one inactive account still using
-- 'admin' stays valid without being touched; Postgres enums can't shrink
-- without recreating the type, and there's no need to here. Each ADD VALUE
-- is its own statement (required) and IF NOT EXISTS-safe to rerun.
ALTER TYPE "admin_role" ADD VALUE IF NOT EXISTS 'director';
--> statement-breakpoint
ALTER TYPE "admin_role" ADD VALUE IF NOT EXISTS 'support_operator';
--> statement-breakpoint
ALTER TYPE "admin_role" ADD VALUE IF NOT EXISTS 'accountant';
--> statement-breakpoint
ALTER TYPE "admin_role" ADD VALUE IF NOT EXISTS 'developer';
--> statement-breakpoint
ALTER TYPE "admin_role" ADD VALUE IF NOT EXISTS 'marketer';
--> statement-breakpoint
ALTER TYPE "admin_role" ADD VALUE IF NOT EXISTS 'medsoft_seller';
--> statement-breakpoint
ALTER TYPE "admin_role" ADD VALUE IF NOT EXISTS 'hr';
