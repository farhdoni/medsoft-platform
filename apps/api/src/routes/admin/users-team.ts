import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRight } from '../../lib/rbac.js';
import { db } from '@medsoft/db';
import { adminRoles, adminUserRoles, adminUsers } from '@medsoft/db';
import { eq } from 'drizzle-orm';
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
