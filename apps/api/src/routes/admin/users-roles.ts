import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import { adminRoles } from '@medsoft/db';
import { eq } from 'drizzle-orm';

// Split out of admin/users.ts (docs/routes-split-plan.md) — right
// settings:roles_read/manage. Mounted at the same prefix as before
// (/v1/admin/users), so external paths are unchanged.

export const usersRolesRouter = new Hono();
usersRolesRouter.use('*', requireAuth);

// ─── GET /roles ────────────────────────────────────────────────────────────────

usersRolesRouter.get('/roles', async (c) => {
  try {
    const roles = await db.select().from(adminRoles).orderBy(adminRoles.id);
    return c.json({ data: roles });
  } catch (err) {
    console.error('List roles error:', err);
    return c.json({ error: 'Failed to list roles' }, 500);
  }
});

// ─── POST /roles ───────────────────────────────────────────────────────────────

usersRolesRouter.post(
  '/roles',
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

usersRolesRouter.delete('/roles/:id', async (c) => {
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
