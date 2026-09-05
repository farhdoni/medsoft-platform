import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRight } from '../../lib/rbac.js';
import { wouldOrphanSuperadmins } from '../../lib/team-guard.js';
import { db } from '@medsoft/db';
import { adminRoles, adminUserRoles, adminUsers, adminSessions } from '@medsoft/db';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Split out of admin/users.ts (docs/routes-split-plan.md) — right
// settings:team_read/manage. Mounted at the same prefix as before
// (/v1/admin/users), so external paths are unchanged.
//
// docs/rbac-model.md enforcement, first pass (feat/rbac-enforce-1): this
// file carries two different rights (read vs manage), so — per the task —
// requireRight goes on each route individually, not on `router.use('*', ...)`
// for the whole file. Only requireAuth is router-wide.

export const usersTeamRouter = new Hono();
usersTeamRouter.use('*', requireAuth);

// ─── GET /team ─────────────────────────────────────────────────────────────────

usersTeamRouter.get('/team', requireRight('settings:team_read'), async (c) => {
  try {
    const admins = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        fullName: adminUsers.fullName,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        lastLoginAt: adminUsers.lastLoginAt,
        createdAt: adminUsers.createdAt,
        roleId: adminUserRoles.roleId,
        roleName: adminRoles.name,
        roleDisplayName: adminRoles.displayName,
        rolePermissions: adminRoles.permissions,
      })
      .from(adminUsers)
      .leftJoin(adminUserRoles, eq(adminUsers.id, adminUserRoles.userId))
      .leftJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id))
      .orderBy(adminUsers.createdAt);
    return c.json({ data: admins });
  } catch (err) {
    console.error('List team error:', err);
    return c.json({ error: 'Failed to list team' }, 500);
  }
});

// ─── POST /team/invite ─────────────────────────────────────────────────────────

usersTeamRouter.post(
  '/team/invite',
  requireRight('settings:team_manage'),
  zValidator('json', z.object({
    email: z.string().email(),
    fullName: z.string(),
    roleId: z.number().int(),
    password: z.string(),
  })),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const passwordHash = await bcrypt.hash(body.password, 10);
      const [newAdmin] = await db.insert(adminUsers).values({
        email: body.email,
        fullName: body.fullName,
        role: 'admin',
        isActive: true,
        passwordHash,
      }).returning();

      await db.insert(adminUserRoles).values({
        userId: newAdmin.id,
        roleId: body.roleId,
      });

      return c.json({ admin: newAdmin }, 201);
    } catch (err) {
      console.error('Team invite error:', err);
      return c.json({ error: 'Failed to create admin user' }, 500);
    }
  }
);

// ─── Role change + activate/deactivate (feat/rbac-enforce-2) ──────────────────
//
// Both gated by settings:team_manage, same right as invite — no new
// permission added, per the task.
//
// Why session revocation on both routes, not just deactivate: requireAuth
// (middleware/auth.ts) never re-checks admin_users.isActive — it only checks
// that the admin_sessions row isn't expired/revoked. Confirmed empirically
// against a real local session before writing this: flipping isActive alone
// left an already-issued access token working until it naturally expired.
// Revoking the session is what actually cuts it off immediately. Role change
// needs the same treatment for one specific direction: hasRight()'s
// superadmin fast path trusts the JWT's `role` claim (baked in at
// login/refresh) without touching the DB, so demoting someone away from the
// legacy admin_users.role = 'superadmin' enum doesn't take effect on their
// current session until that claim is refreshed — revoking their session
// forces that. (Every other kind of role change was already immediate: the
// non-fast-path lookup in getEffectiveRights reads admin_user_roles fresh
// on every request.) Revoking uniformly, instead of only for that one
// direction, is simpler and has no real downside — worst case someone
// promoted to a stronger role has to log back in once.
//
// Why admin_users.role gets synced on every change, not just left alone:
// that enum column (schema/admins.ts adminRoleEnum — it already carries all
// eight real role names, not just the legacy superadmin/admin/viewer) is
// what the fast path above actually reads. ROLE_RIGHTS['superadmin'] would
// still resolve correctly through the normal per-request DB lookup even if
// the enum said something else — the fast path is only an optimization for
// granting. But leaving the enum at 'superadmin' after moving someone OFF
// the superadmin role would leave that bypass live: full access via the
// fast path forever, regardless of what admin_user_roles says. So every
// role change sets the enum to the new role's own name — it's a valid enum
// value for all eight — keeping the one thing the fast path reads in
// lockstep with the thing that actually represents the assignment.
//
// "Last active superadmin" is computed the same way for both routes: anyone
// who currently has the run of the place, whether that's via the enum or
// via an admin_user_roles link to the 'superadmin' row (the invite flow can
// produce that combination — it hardcodes the enum to 'admin' regardless of
// the chosen role). Undercounting either source would defeat the point of
// the check.

async function getActiveSuperadminIds(): Promise<Set<string>> {
  const [byEnum, byAssignment] = await Promise.all([
    db.select({ id: adminUsers.id })
      .from(adminUsers)
      .where(and(eq(adminUsers.role, 'superadmin'), eq(adminUsers.isActive, true))),
    db.select({ id: adminUsers.id })
      .from(adminUsers)
      .innerJoin(adminUserRoles, eq(adminUserRoles.userId, adminUsers.id))
      .innerJoin(adminRoles, eq(adminRoles.id, adminUserRoles.roleId))
      .where(and(eq(adminRoles.name, 'superadmin'), eq(adminUsers.isActive, true))),
  ]);
  return new Set([...byEnum.map((r) => r.id), ...byAssignment.map((r) => r.id)]);
}

// wouldOrphanSuperadmins itself lives in lib/team-guard.ts, dependency-free
// on purpose so it's unit-testable against a constructed Set without a live
// DB (see team-guard.test.ts). Both PATCH handlers below call it — not a
// re-implementation — before applying their change.

async function revokeActiveSessions(userId: string): Promise<void> {
  await db.update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminSessions.adminUserId, userId), isNull(adminSessions.revokedAt)));
}

// ─── PATCH /team/:id/role ───────────────────────────────────────────────────────

usersTeamRouter.patch(
  '/team/:id/role',
  requireRight('settings:team_manage'),
  zValidator('json', z.object({ roleId: z.number().int() })),
  async (c) => {
    try {
      const selfId = c.get('adminId');
      const targetId = c.req.param('id');
      if (selfId === targetId) {
        return c.json({ error: 'Нельзя изменить роль самому себе через эту страницу' }, 400);
      }

      const { roleId } = c.req.valid('json');

      const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, targetId)).limit(1);
      if (!target) return c.json({ error: 'Администратор не найден' }, 404);

      const [newRole] = await db.select().from(adminRoles)
        .where(and(eq(adminRoles.id, roleId), eq(adminRoles.isDeprecated, false)))
        .limit(1);
      if (!newRole) return c.json({ error: 'Роль не найдена' }, 400);

      const activeSuperadmins = await getActiveSuperadminIds();
      if (wouldOrphanSuperadmins(activeSuperadmins, targetId, newRole.name === 'superadmin')) {
        return c.json({
          error: 'Нельзя изменить роль последнего активного супер-администратора — сначала назначьте ещё одного',
        }, 409);
      }

      await db.transaction(async (tx) => {
        await tx.delete(adminUserRoles).where(eq(adminUserRoles.userId, targetId));
        await tx.insert(adminUserRoles).values({ userId: targetId, roleId: newRole.id });
        await tx.update(adminUsers)
          .set({
            role: newRole.name as typeof adminUsers.$inferSelect.role,
            updatedAt: new Date(),
          })
          .where(eq(adminUsers.id, targetId));
      });

      await revokeActiveSessions(targetId);

      return c.json({ ok: true });
    } catch (err) {
      console.error('Change role error:', err);
      return c.json({ error: 'Failed to change role' }, 500);
    }
  }
);

// ─── PATCH /team/:id/active ─────────────────────────────────────────────────────

usersTeamRouter.patch(
  '/team/:id/active',
  requireRight('settings:team_manage'),
  zValidator('json', z.object({ isActive: z.boolean() })),
  async (c) => {
    try {
      const selfId = c.get('adminId');
      const targetId = c.req.param('id');
      if (selfId === targetId) {
        return c.json({ error: 'Нельзя изменить свой собственный доступ через эту страницу' }, 400);
      }

      const { isActive } = c.req.valid('json');

      const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, targetId)).limit(1);
      if (!target) return c.json({ error: 'Администратор не найден' }, 404);

      if (!isActive) {
        const activeSuperadmins = await getActiveSuperadminIds();
        if (wouldOrphanSuperadmins(activeSuperadmins, targetId, false)) {
          return c.json({
            error: 'Нельзя деактивировать последнего активного супер-администратора — сначала назначьте ещё одного',
          }, 409);
        }
      }

      await db.update(adminUsers)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(adminUsers.id, targetId));

      if (!isActive) await revokeActiveSessions(targetId);

      return c.json({ ok: true });
    } catch (err) {
      console.error('Toggle active error:', err);
      return c.json({ error: 'Failed to update status' }, 500);
    }
  }
);
