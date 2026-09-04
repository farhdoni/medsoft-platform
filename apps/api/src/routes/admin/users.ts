import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRight } from '../../lib/rbac.js';
import { db } from '@medsoft/db';
import { aivitaUsers, doctorProfiles } from '@medsoft/db';
import { eq, ilike, or, and, isNull, lte, gt, asc, desc, count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Trimmed by docs/routes-split-plan.md — roles/team/doctor-verify moved to
// users-roles.ts / users-team.ts / users-doctor-verify.ts. This file keeps
// the aivitaUsers CRUD (users:read/edit/delete). Still mounted at
// /v1/admin/users, same as the other three — external paths unchanged.
//
// docs/rbac-model.md enforcement (feat/rbac-enforce-2, third pass):
// requireRight goes per-route (requireAuth stays router-wide) — users:read
// on the two GETs, users:edit on the three routes that mutate an existing
// user without deleting it, users:delete on the soft-delete route. Placed
// before zValidator in every case, so a bad query/body never leaks past
// the gate either.

const router = new Hono();

router.use('*', requireAuth);

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

router.get('/', requireRight('users:read'), zValidator('query', listSchema), async (c) => {
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

router.get('/:id', requireRight('users:read'), async (c) => {
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
  requireRight('users:edit'),
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

router.post('/:id/block', requireRight('users:edit'), async (c) => {
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

router.post('/:id/reset-password', requireRight('users:edit'), async (c) => {
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

router.delete('/:id', requireRight('users:delete'), async (c) => {
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
