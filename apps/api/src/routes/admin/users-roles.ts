import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRight, ROLE_RIGHTS, groupRightsByDomain, type RoleSlug } from '../../lib/rbac.js';
import { db } from '@medsoft/db';
import { adminRoles } from '@medsoft/db';
import { eq } from 'drizzle-orm';

// Split out of admin/users.ts (docs/routes-split-plan.md) — right
// settings:roles_read/manage. Mounted at the same prefix as before
// (/v1/admin/users), so external paths are unchanged.
//
// docs/rbac-model.md enforcement (feat/rbac-enforce-2, third pass): this
// file edits the role/right catalog itself, so it's the most sensitive of
// the three files in this pass — requireRight goes per-route (requireAuth
// stays router-wide), settings:roles_read on GET, settings:roles_manage on
// every mutation, before zValidator in every case.

export const usersRolesRouter = new Hono();
usersRolesRouter.use('*', requireAuth);

// ─── GET /roles ────────────────────────────────────────────────────────────────
//
// Vocabulary unification pass: rights now come from ROLE_RIGHTS (code) —
// the catalog requireRight actually enforces against — not
// admin_roles.permissions, the legacy 13-checkbox column the old UI
// matrix edited and that was never a real gate anywhere. Only the 8 rows
// with is_deprecated = false are returned (the 5 pre-RBAC-foundation
// legacy roles — admin/moderator/support/marketing/finance — are
// excluded); this is also the list the team-invite role picker consumes,
// so it doubles as "assignable roles" (id + name + displayName) and
// "what can each role do" (rightsByDomain) in one response.

usersRolesRouter.get('/roles', requireRight('settings:roles_read'), async (c) => {
  try {
    const roles = await db.select({
      id: adminRoles.id,
      name: adminRoles.name,
      displayName: adminRoles.displayName,
    })
      .from(adminRoles)
      .where(eq(adminRoles.isDeprecated, false))
      .orderBy(adminRoles.id);

    const data = roles.map((role) => {
      const rights = ROLE_RIGHTS[role.name as RoleSlug] ?? [];
      return {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        rightsByDomain: groupRightsByDomain(rights),
      };
    });

    return c.json({ data });
  } catch (err) {
    console.error('List roles error:', err);
    return c.json({ error: 'Failed to list roles' }, 500);
  }
});

// ─── POST /roles ───────────────────────────────────────────────────────────────

usersRolesRouter.post(
  '/roles',
  requireRight('settings:roles_manage'),
  zValidator('json', z.object({
    name: z.string(),
    displayName: z.string(),
    permissions: z.record(z.boolean().optional()),
  })),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const [role] = await db.insert(adminRoles).values({
        name: body.name,
        displayName: body.displayName,
        permissions: body.permissions as Record<string, boolean>,
      }).returning();
      return c.json({ role }, 201);
    } catch (err) {
      console.error('Create role error:', err);
      return c.json({ error: 'Failed to create role' }, 500);
    }
  }
);

// ─── PUT /roles/:id ────────────────────────────────────────────────────────────

usersRolesRouter.put(
  '/roles/:id',
  requireRight('settings:roles_manage'),
  zValidator('json', z.object({
    name: z.string().optional(),
    displayName: z.string().optional(),
    permissions: z.record(z.boolean().optional()).optional(),
  })),
  async (c) => {
    try {
      const id = Number(c.req.param('id'));
      const existing = await db.select().from(adminRoles).where(eq(adminRoles.id, id)).limit(1);
      if (!existing.length) return c.json({ error: 'Role not found' }, 404);
      if (existing[0].name === 'superadmin') return c.json({ error: 'Forbidden' }, 403);

      const body = c.req.valid('json');
      const updateData: Partial<typeof adminRoles.$inferInsert> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.displayName !== undefined) updateData.displayName = body.displayName;
      if (body.permissions !== undefined) updateData.permissions = body.permissions as Record<string, boolean>;

      const [updated] = await db.update(adminRoles).set(updateData).where(eq(adminRoles.id, id)).returning();
      return c.json({ role: updated });
    } catch (err) {
      console.error('Update role error:', err);
      return c.json({ error: 'Failed to update role' }, 500);
    }
  }
);

// ─── DELETE /roles/:id ─────────────────────────────────────────────────────────

usersRolesRouter.delete('/roles/:id', requireRight('settings:roles_manage'), async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const existing = await db.select().from(adminRoles).where(eq(adminRoles.id, id)).limit(1);
    if (!existing.length) return c.json({ error: 'Role not found' }, 404);
    if (existing[0].name === 'superadmin') return c.json({ error: 'Forbidden' }, 403);

    await db.delete(adminRoles).where(eq(adminRoles.id, id));
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete role error:', err);
    return c.json({ error: 'Failed to delete role' }, 500);
  }
});
