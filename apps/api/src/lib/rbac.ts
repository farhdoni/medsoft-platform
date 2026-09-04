/**
 * RBAC foundation (docs/rbac-model.md). Foundation only — nothing here is
 * wired to any route yet. `requireRight` exists so it can be attached to
 * routers in a later pass, once docs/routes-split-plan.md's split files
 * each carry exactly one right.
 */
import { db } from '@medsoft/db';
import { adminRoles, adminUserRoles } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';

// ─── Catalog (§3 + §4) — the one place every right slug is spelled out ───────

export const PERMISSIONS = [
  'main:read',

  'users:read', 'users:edit', 'users:delete',

  'aivita:doctors_read', 'aivita:doctors_manage',
  'aivita:billing_read', 'aivita:billing_manage',
  'aivita:content_read', 'aivita:content_manage',
  'aivita:support',

  'partners:read', 'partners:manage', 'partners:issue_key',

  'marketing:read', 'marketing:manage',

  'content:read', 'content:manage',
  'content:clinic_requests_read', 'content:clinic_requests_manage',

  'notifications:read', 'notifications:manage',

  'dashboard:read',

  'security:read', 'security:manage',

  'reports:generate',

  'finance:read', 'finance:edit', 'finance:prices_manage',
  'finance:settings_read', 'finance:settings_manage',

  'system:read', 'system:manage',

  'settings:ai_read', 'settings:ai_manage',
  'settings:roles_read', 'settings:roles_manage',
  'settings:team_read', 'settings:team_manage',

  'admins:manage',

  // §4 — third level, above the section-scoped rights.
  'pii:reveal', 'medical:read_phi', 'medical:manage_phi',
] as const;

export type Permission = typeof PERMISSIONS[number];

// ─── Role catalog (§6) — the eight roles, plus the senior-operator flag ──────
// "Оператор поддержки (старший)" is not a ninth role: it's `is_senior` on a
// support_operator assignment (admin_user_roles.is_senior), adding
// SENIOR_SUPPORT_EXTRA_RIGHTS on top of the base role below.

export type RoleSlug =
  | 'superadmin' | 'director' | 'support_operator' | 'accountant'
  | 'developer' | 'marketer' | 'medsoft_seller' | 'hr';

// Vocabulary unification pass (feat/rbac-enforce-2): notifications:read/
// manage went to whichever roles already held marketing:read/marketing:manage
// respectively (director+marketer for read, marketer alone for manage) —
// copied verbatim, not re-derived. dashboard:read went to whichever roles
// hold BOTH finance:read AND users:read at once (director, accountant) —
// computed by intersecting the two lists below, not guessed. superadmin
// needs no edit: it's `[...PERMISSIONS]`, so all three new rights flow in
// automatically from the catalog above.
export const ROLE_RIGHTS: Record<RoleSlug, Permission[]> = {
  superadmin: [...PERMISSIONS],

  director: [
    'main:read', 'users:read', 'partners:read', 'partners:manage',
    'aivita:doctors_read', 'aivita:billing_read', 'marketing:read',
    'finance:prices_manage', 'security:read', 'reports:generate',
    'finance:read', 'finance:settings_read', 'finance:settings_manage',
    'notifications:read', 'dashboard:read',
  ],

  support_operator: ['aivita:support', 'users:read', 'main:read'],

  accountant: [
    'finance:read', 'finance:edit', 'finance:settings_read',
    'reports:generate', 'users:read', 'main:read',
    'dashboard:read',
  ],

  developer: [
    'system:read', 'system:manage', 'security:read', 'security:manage',
    'settings:ai_read', 'settings:ai_manage', 'main:read', 'reports:generate',
  ],

  marketer: [
    'marketing:read', 'marketing:manage', 'content:read', 'content:manage',
    'finance:prices_manage', 'main:read', 'reports:generate',
    'notifications:read', 'notifications:manage',
  ],

  medsoft_seller: [
    'partners:read', 'partners:manage',
    'content:clinic_requests_read', 'content:clinic_requests_manage',
    'main:read',
  ],

  hr: ['settings:team_read', 'settings:team_manage', 'main:read'],
};

/** Extra rights `is_senior=true` adds on top of a support_operator's base rights. */
export const SENIOR_SUPPORT_EXTRA_RIGHTS: Permission[] = ['pii:reveal', 'users:edit'];

/**
 * Groups a role's rights by domain (the part of the slug before the first
 * ':'), for the read-only /roles reference page — every slug in this
 * catalog is "domain:action", so splitting on the first colon is safe and
 * uniform across all of them.
 */
export function groupRightsByDomain(rights: Permission[]): Record<string, string[]> {
  const byDomain: Record<string, string[]> = {};
  for (const right of rights) {
    const domain = right.split(':')[0];
    (byDomain[domain] ??= []).push(right);
  }
  for (const domain of Object.keys(byDomain)) byDomain[domain].sort();
  return byDomain;
}

// ─── Check function — written, not applied anywhere yet ──────────────────────

/**
 * Effective rights for one admin, read fresh from the DB every call — not
 * from the JWT. The role string in the token is fixed at login time; a
 * right pulled from there would keep working after being revoked until the
 * admin logs in again. superadmin is the one fast path that skips the
 * query, matching requireSuperadmin's own JWT-only check elsewhere.
 */
export async function getEffectiveRights(adminId: string, adminRole: string): Promise<Set<Permission>> {
  if (adminRole === 'superadmin') return new Set(PERMISSIONS);

  const assignments = await db
    .select({ name: adminRoles.name, isSenior: adminUserRoles.isSenior })
    .from(adminUserRoles)
    .innerJoin(adminRoles, eq(adminRoles.id, adminUserRoles.roleId))
    .where(eq(adminUserRoles.userId, adminId));

  const rights = new Set<Permission>();
  for (const a of assignments) {
    const base = ROLE_RIGHTS[a.name as RoleSlug];
    if (!base) continue; // unknown/legacy role name in admin_roles — grants nothing
    for (const r of base) rights.add(r);
    if (a.isSenior) for (const r of SENIOR_SUPPORT_EXTRA_RIGHTS) rights.add(r);
  }
  return rights;
}

export async function hasRight(adminId: string, adminRole: string, right: Permission): Promise<boolean> {
  if (adminRole === 'superadmin') return true;
  const rights = await getEffectiveRights(adminId, adminRole);
  return rights.has(right);
}

/**
 * Denied by default. Not mounted on any router yet — this is the function
 * a future pass attaches per split file (docs/routes-split-plan.md), one
 * `router.use('*', requireRight('...'))` per file.
 */
export const requireRight = (right: Permission) => createMiddleware(async (c, next) => {
  const adminId = c.get('adminId');
  const adminRole = c.get('adminRole');
  if (!(await hasRight(adminId, adminRole, right))) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});
