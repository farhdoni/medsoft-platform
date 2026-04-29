import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { familyMembers } from '@medsoft/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaFamilyRouter = new Hono();

aivitaFamilyRouter.use('*', requireAivitaAuth);

// ─── List family members ───────────────────────────────────────────────────────
aivitaFamilyRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(familyMembers)
    .where(and(eq(familyMembers.ownerId, userId), isNull(familyMembers.deletedAt)));
  return c.json({ data: rows });
});

// ─── Add family member ─────────────────────────────────────────────────────────
aivitaFamilyRouter.post(
  '/',
  zValidator('json', z.object({
    memberName: z.string().min(1),
    memberRelation: z.string(), // 'spouse' | 'child' | 'parent' | 'sibling' | 'other'
    memberBirthDate: z.string().optional(),
    memberGender: z.string().optional(),
    invitePhone: z.string().optional(),
    inviteEmail: z.string().email().optional(),
    permissionLevel: z.enum(['view', 'edit', 'full']).default('view'),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const [created] = await db.insert(familyMembers).values({
      ownerId: userId,
      ...body,
    }).returning();
    return c.json({ data: created }, 201);
  }
);

// ─── Update family member ──────────────────────────────────────────────────────
aivitaFamilyRouter.patch(
  '/:id',
  zValidator('json', z.object({
    memberName: z.string().min(1).optional(),
    memberRelation: z.string().optional(),
    memberBirthDate: z.string().optional(),
    memberGender: z.string().optional(),
    permissionLevel: z.enum(['view', 'edit', 'full']).optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const [updated] = await db.update(familyMembers)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(familyMembers.id, id), eq(familyMembers.ownerId, userId)))
      .returning();

    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: updated });
  }
);

// ─── Remove family member ──────────────────────────────────────────────────────
aivitaFamilyRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(familyMembers)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(familyMembers.id, id), eq(familyMembers.ownerId, userId)));
  return c.json({ data: { deleted: true } });
});
