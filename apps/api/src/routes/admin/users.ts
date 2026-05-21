import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import { aivitaUsers, doctorProfiles, adminRoles, adminUserRoles, adminUsers } from '@medsoft/db';
import { eq, ilike, or, and, isNull, isNotNull, desc, asc, count, gte, lte, gt, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const router = new Hono();

router.use('*', requireAuth);

// ─── GET /roles ────────────────────────────────────────────────────────────────

router.get('/roles', async (c) => {
  try {
    const roles = await db.select().from(adminRoles).orderBy(adminRoles.id);
    return c.json({ data: roles });
  } catch (err) {
    console.error('List roles error:', err);
    return c.json({ error: 'Failed to list roles' }, 500);
  }
});

// ─── POST /roles ───────────────────────────────────────────────────────────────

router.post(
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

router.put(
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

router.delete('/roles/:id', async (c) => {
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

// ─── GET /team ─────────────────────────────────────────────────────────────────

router.get('/team', async (c) => {
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

router.post(
  '/team/invite',
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

// ─── PUT /doctors/:id/verify ──────────────────────────────────────────────────

router.put(
  '/doctors/:id/verify',
  zValidator('json', z.object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
  })),
  async (c) => {
    try {
      const id = c.req.param('id');
      const adminId = c.get('adminId');
      const body = c.req.valid('json');

      const [profile] = await db.select().from(doctorProfiles).where(eq(doctorProfiles.id, id)).limit(1);
      if (!profile) return c.json({ error: 'Doctor profile not found' }, 404);

      if (body.action === 'approve') {
        await db.update(doctorProfiles)
          .set({
            verificationStatus: 'verified',
            verifiedAt: new Date(),
            verifiedBy: adminId,
          })
          .where(eq(doctorProfiles.id, id));

        await db.update(aivitaUsers)
          .set({ role: 'doctor' })
          .where(eq(aivitaUsers.id, profile.userId));
      } else {
        await db.update(doctorProfiles)
          .set({
            verificationStatus: 'rejected',
            rejectionReason: body.reason ?? '',
          })
          .where(eq(doctorProfiles.id, id));
      }

      return c.json({ ok: true });
    } catch (err) {
      console.error('Doctor verify error:', err);
      return c.json({ error: 'Failed to verify doctor' }, 500);
    }
  }
);

// ─── GET / ─────────────────────────────────────────────────────────────────────

const listSchema = z.object({
  role: z.enum(['patient', 'doctor', 'all']).default('all'),
  q: z.string().optional(),
  tier: z.enum(['free', 'plus', 'pro', 'all']).default('all'),
  status: z.enum(['active', 'blocked', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name', 'email', 'created_at', 'last_login_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', zValidator('query', listSchema), async (c) => {
  try {
    const query = c.req.valid('query');
    const { role, q, tier, status, page, limit, sort, order } = query;
    const offset = (page - 1) * limit;

    const conditions = [];

    // Always exclude deleted unless explicitly including them (we never do)
    conditions.push(isNull(aivitaUsers.deletedAt));

    // Role filter
    if (role === 'patient') conditions.push(eq(aivitaUsers.role, 'patient'));
    else if (role === 'doctor') conditions.push(eq(aivitaUsers.role, 'doctor'));

    // Search
    if (q) {
      conditions.push(
        or(
          ilike(aivitaUsers.name, `%${q}%`),
          ilike(aivitaUsers.email, `%${q}%`),
          ilike(aivitaUsers.phone, `%${q}%`),
        )!
      );
    }

    // Tier filter
    if (tier !== 'all') conditions.push(eq(aivitaUsers.plan, tier));

    // Status filter
    if (status === 'active') {
      conditions.push(
        or(
          isNull(aivitaUsers.lockedUntil),
          lte(aivitaUsers.lockedUntil, new Date()),
        )!
      );
    } else if (status === 'blocked') {
      conditions.push(gt(aivitaUsers.lockedUntil, new Date()));
    }

    const whereClause = and(...conditions);

    // Sort column mapping
    const sortColumn = (() => {
      switch (sort) {
        case 'name': return aivitaUsers.name;
        case 'email': return aivitaUsers.email;
        case 'last_login_at': return aivitaUsers.lastLoginAt;
        default: return aivitaUsers.createdAt;
      }
    })();

    const orderFn = order === 'asc' ? asc : desc;

    const [rows, totalResult] = await Promise.all([
      db.select({
        id: aivitaUsers.id,
        name: aivitaUsers.name,
        email: aivitaUsers.email,
        phone: aivitaUsers.phone,
        plan: aivitaUsers.plan,
        role: aivitaUsers.role,
        createdAt: aivitaUsers.createdAt,
        lastLoginAt: aivitaUsers.lastLoginAt,
        lockedUntil: aivitaUsers.lockedUntil,
      })
        .from(aivitaUsers)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      db.select({ cnt: count() }).from(aivitaUsers).where(whereClause),
    ]);

    return c.json({
      data: rows,
      total: Number(totalResult[0]?.cnt ?? 0),
      page,
      limit,
    });
  } catch (err) {
    console.error('List users error:', err);
    return c.json({ error: 'Failed to list users' }, 500);
  }
});

// ─── GET /:id ──────────────────────────────────────────────────────────────────

router.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const [user] = await db.select({
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      phone: aivitaUsers.phone,
      plan: aivitaUsers.plan,
      role: aivitaUsers.role,
      createdAt: aivitaUsers.createdAt,
      lastLoginAt: aivitaUsers.lastLoginAt,
      lockedUntil: aivitaUsers.lockedUntil,
      onboardingCompleted: aivitaUsers.onboardingCompleted,
      referralCode: aivitaUsers.referralCode,
    })
      .from(aivitaUsers)
      .where(eq(aivitaUsers.id, id))
      .limit(1);

    if (!user) return c.json({ error: 'User not found' }, 404);

    const [doctorProfile] = await db.select({
      id: doctorProfiles.id,
      userId: doctorProfiles.userId,
      specialization: doctorProfiles.specialization,
      verificationStatus: doctorProfiles.verificationStatus,
      rating: doctorProfiles.rating,
      totalPatients: doctorProfiles.totalPatients,
      diplomaScanUrl: doctorProfiles.diplomaScanUrl,
      diplomaUniversity: doctorProfiles.diplomaUniversity,
      bio: doctorProfiles.bio,
      consultationPrice: doctorProfiles.consultationPrice,
      experienceStartDate: doctorProfiles.experienceStartDate,
      showInCatalog: doctorProfiles.showInCatalog,
      verifiedAt: doctorProfiles.verifiedAt,
      rejectionReason: doctorProfiles.rejectionReason,
      createdAt: doctorProfiles.createdAt,
    })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, id))
      .limit(1);

    return c.json({
      user,
      doctorProfile: doctorProfile ?? null,
    });
  } catch (err) {
    console.error('Get user error:', err);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// ─── PUT /:id ──────────────────────────────────────────────────────────────────

router.put(
  '/:id',
  zValidator('json', z.object({
    tier: z.string().optional(),
    status: z.enum(['active', 'blocked']).optional(),
  })),
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = c.req.valid('json');

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.tier !== undefined) updateData.plan = body.tier;

      if (body.status === 'blocked') {
        updateData.lockedUntil = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000);
      } else if (body.status === 'active') {
        updateData.lockedUntil = null;
      }

      const [updated] = await db
        .update(aivitaUsers)
        .set(updateData as Partial<typeof aivitaUsers.$inferInsert>)
        .where(eq(aivitaUsers.id, id))
        .returning();

      if (!updated) return c.json({ error: 'User not found' }, 404);

      return c.json({ user: updated });
    } catch (err) {
      console.error('Update user error:', err);
      return c.json({ error: 'Failed to update user' }, 500);
    }
  }
);

// ─── POST /:id/block ───────────────────────────────────────────────────────────

router.post('/:id/block', async (c) => {
  try {
    const id = c.req.param('id');
    await db.update(aivitaUsers)
      .set({
        lockedUntil: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(aivitaUsers.id, id));
    return c.json({ ok: true });
  } catch (err) {
    console.error('Block user error:', err);
    return c.json({ error: 'Failed to block user' }, 500);
  }
});

// ─── POST /:id/reset-password ──────────────────────────────────────────────────

router.post('/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id');
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars[Math.floor(Math.random() * chars.length)];
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(aivitaUsers)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(aivitaUsers.id, id));
    return c.json({ newPassword });
  } catch (err) {
    console.error('Reset password error:', err);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

// ─── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await db.update(aivitaUsers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aivitaUsers.id, id));
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete user error:', err);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

export { router as adminUsersRouter };
