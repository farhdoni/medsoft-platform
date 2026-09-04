import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import { aivitaUsers, doctorProfiles } from '@medsoft/db';
import { eq } from 'drizzle-orm';

// Split out of admin/users.ts (docs/routes-split-plan.md). Isolated into its
// own file deliberately: this route doesn't fit any of the three groups
// docs/rbac-model.md documents for this file (settings:roles_*,
// settings:team_*, users:*) — it's a doctor-verification action, physically
// living here rather than in aivita-admin.ts's own doctor-verify route
// (PATCH /v1/aivita-admin/aivita-doctors/:id/verify). The two are NOT
// equivalent: this one also flips aivitaUsers.role to 'doctor'; the other
// manages doctorProfiles.showInCatalog/isActive instead. Both are called by
// different admin-panel screens today — see the report for details. No
// permission is assigned to this route by this split; that decision (which
// right it should carry, or whether it should be merged/removed) is open.

export const usersDoctorVerifyRouter = new Hono();
usersDoctorVerifyRouter.use('*', requireAuth);

// ─── PUT /doctors/:id/verify ──────────────────────────────────────────────────

usersDoctorVerifyRouter.put(
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
