import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { familyMembers, familyLinkRequests, medicalCards, aivitaUsers } from '@medsoft/db';
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

// ─── Search user by medical card number ───────────────────────────────────────
aivitaFamilyRouter.get('/search', async (c) => {
  const userId = c.get('aivitaUserId');
  const cardCode = c.req.query('card');
  if (!cardCode?.trim()) return c.json({ error: 'card param required' }, 400);

  const [row] = await db
    .select({
      userId: medicalCards.userId,
      cardCode: medicalCards.cardCode,
      name: aivitaUsers.name,
      avatarUrl: aivitaUsers.avatarUrl,
    })
    .from(medicalCards)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, medicalCards.userId))
    .where(eq(medicalCards.cardCode, cardCode.trim().toUpperCase()))
    .limit(1);

  if (!row) return c.json({ error: 'not_found' }, 404);
  if (row.userId === userId) return c.json({ error: 'self' }, 409);

  return c.json({
    data: {
      userId: row.userId,
      cardCode: row.cardCode,
      name: row.name ?? null,
      avatarUrl: row.avatarUrl ?? null,
    },
  });
});

// ─── Incoming link requests (pending) ─────────────────────────────────────────
aivitaFamilyRouter.get('/link-requests', async (c) => {
  const userId = c.get('aivitaUserId');

  const rows = await db
    .select({
      id: familyLinkRequests.id,
      status: familyLinkRequests.status,
      createdAt: familyLinkRequests.createdAt,
      familyMemberId: familyLinkRequests.familyMemberId,
      fromUserId: familyLinkRequests.fromUserId,
      fromName: aivitaUsers.name,
      fromAvatarUrl: aivitaUsers.avatarUrl,
    })
    .from(familyLinkRequests)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, familyLinkRequests.fromUserId))
    .where(and(
      eq(familyLinkRequests.toUserId, userId),
      eq(familyLinkRequests.status, 'pending'),
    ));

  return c.json({ data: rows });
});

// ─── Create link request (initiator side) ─────────────────────────────────────
aivitaFamilyRouter.post(
  '/link-request',
  zValidator('json', z.object({
    toUserId: z.string().uuid(),
    familyMemberId: z.string().uuid(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { toUserId, familyMemberId } = c.req.valid('json');

    if (toUserId === userId) return c.json({ error: 'self' }, 409);

    // Verify the member belongs to this user
    const [member] = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(and(eq(familyMembers.id, familyMemberId), eq(familyMembers.ownerId, userId)))
      .limit(1);

    if (!member) return c.json({ error: 'Member not found' }, 404);

    const [created] = await db.insert(familyLinkRequests).values({
      fromUserId: userId,
      toUserId,
      familyMemberId,
      status: 'pending',
    }).returning();

    return c.json({ data: created }, 201);
  }
);

// ─── Respond to link request (recipient side) ──────────────────────────────────
aivitaFamilyRouter.post(
  '/link-request/:id/respond',
  zValidator('json', z.object({
    action: z.enum(['accept', 'reject']),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id } = c.req.param();
    const { action } = c.req.valid('json');

    const [request] = await db
      .select()
      .from(familyLinkRequests)
      .where(and(eq(familyLinkRequests.id, id), eq(familyLinkRequests.toUserId, userId), eq(familyLinkRequests.status, 'pending')))
      .limit(1);

    if (!request) return c.json({ error: 'Not found or already resolved' }, 404);

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Update request status
    await db.update(familyLinkRequests)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(familyLinkRequests.id, id));

    if (action === 'accept') {
      // Link the user to the family member + mark accepted
      await db.update(familyMembers)
        .set({
          memberUserId: userId,
          inviteStatus: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(familyMembers.id, request.familyMemberId));
    } else {
      // Mark family member as rejected
      await db.update(familyMembers)
        .set({ inviteStatus: 'rejected', updatedAt: new Date() })
        .where(eq(familyMembers.id, request.familyMemberId));
    }

    return c.json({ data: { ok: true, status: newStatus } });
  }
);

// ─── Add family member ─────────────────────────────────────────────────────────
aivitaFamilyRouter.post(
  '/',
  zValidator('json', z.object({
    memberName: z.string().min(1),
    memberRelation: z.string(),
    memberBirthDate: z.string().nullable().optional(),
    memberGender: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    memberUserId: z.string().uuid().nullable().optional(),
    invitePhone: z.string().optional(),
    inviteEmail: z.string().email().optional(),
    permissionLevel: z.enum(['view', 'edit', 'full']).default('view'),
    // When set to 'pending', member was created via link-request flow
    inviteStatus: z.enum(['pending', 'accepted']).default('accepted'),
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
    memberBirthDate: z.string().nullable().optional(),
    memberGender: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
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
