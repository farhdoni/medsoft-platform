import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  familyMembers, familyLinkRequests, cardClaimRequests,
  medicalCards, aivitaUsers, healthProfiles, allergies, chronicConditions,
} from '@medsoft/db';
import { eq, and, isNull, like, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaFamilyRouter = new Hono();

aivitaFamilyRouter.use('*', requireAivitaAuth);

// ─── Card number generator (queries both medicalCards + family_members) ────────

async function generateChildCardNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `AI-${year}-%`;

  const [lastAdult] = await db
    .select({ code: medicalCards.cardCode })
    .from(medicalCards)
    .where(like(medicalCards.cardCode, pattern))
    .orderBy(desc(medicalCards.cardCode))
    .limit(1);

  const [lastChild] = await db
    .select({ code: familyMembers.cardNumber })
    .from(familyMembers)
    .where(like(familyMembers.cardNumber!, pattern))
    .orderBy(desc(familyMembers.cardNumber!))
    .limit(1);

  const parseNum = (code: string | null | undefined): number => {
    if (!code) return 0;
    const n = parseInt(code.split('-')[2] ?? '0', 10);
    return isNaN(n) ? 0 : n;
  };

  const nextNum = Math.max(parseNum(lastAdult?.code), parseNum(lastChild?.code)) + 1;
  return `AI-${year}-${String(nextNum).padStart(5, '0')}`;
}

// ─── Vaccination list by age group ────────────────────────────────────────────

function getVaccinesByAge(birthDate: string | null): Array<{ name: string; rec: string }> {
  if (!birthDate) return [];
  const age = (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000);
  const list: Array<{ name: string; rec: string }> = [];
  if (age < 1)  list.push(
    { name: 'БЦЖ', rec: '3-5 день жизни' },
    { name: 'Гепатит B', rec: '1, 2, 6 мес' },
  );
  if (age < 2)  list.push(
    { name: 'АКДС', rec: '3, 4.5, 6 мес' },
    { name: 'Полиомиелит', rec: '3, 4.5, 6 мес' },
    { name: 'Пневмококк', rec: '2, 4, 12 мес' },
  );
  if (age >= 1) list.push(
    { name: 'КПК (корь, паротит, краснуха)', rec: '12 мес' },
    { name: 'Гемофильная инфекция', rec: '2 года' },
  );
  if (age >= 7) list.push(
    { name: 'АДС-М (ревакцинация)', rec: '7 лет' },
    { name: 'Грипп', rec: 'Ежегодно' },
  );
  if (age >= 14) list.push(
    { name: 'ВПЧ', rec: '14-15 лет' },
  );
  return list;
}

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

// ─── Search child card by number (for onboarding claim) ───────────────────────

aivitaFamilyRouter.get('/search-child-card', async (c) => {
  const cardNumber = c.req.query('card');
  if (!cardNumber?.trim()) return c.json({ error: 'card param required' }, 400);

  const [row] = await db
    .select({
      id: familyMembers.id,
      cardNumber: familyMembers.cardNumber,
      memberName: familyMembers.memberName,
      memberBirthDate: familyMembers.memberBirthDate,
      memberGender: familyMembers.memberGender,
      ownerId: familyMembers.ownerId,
      migratedToUserId: familyMembers.migratedToUserId,
    })
    .from(familyMembers)
    .where(and(
      eq(familyMembers.cardNumber!, cardNumber.trim().toUpperCase()),
      isNull(familyMembers.deletedAt),
    ))
    .limit(1);

  if (!row) return c.json({ error: 'not_found' }, 404);
  if (row.migratedToUserId) return c.json({ error: 'already_migrated' }, 409);

  return c.json({
    data: {
      id: row.id,
      cardNumber: row.cardNumber,
      memberName: row.memberName,
      memberBirthDate: row.memberBirthDate,
      memberGender: row.memberGender,
      parentUserId: row.ownerId,
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

// ─── Incoming card claim requests (for parent) ────────────────────────────────

aivitaFamilyRouter.get('/claim-requests', async (c) => {
  const userId = c.get('aivitaUserId');

  const claimUserAlias = aivitaUsers;

  const rows = await db
    .select({
      id: cardClaimRequests.id,
      status: cardClaimRequests.status,
      createdAt: cardClaimRequests.createdAt,
      familyMemberId: cardClaimRequests.familyMemberId,
      fromUserId: cardClaimRequests.fromUserId,
      fromName: claimUserAlias.name,
      fromAvatarUrl: claimUserAlias.avatarUrl,
      cardNumber: familyMembers.cardNumber,
      memberName: familyMembers.memberName,
    })
    .from(cardClaimRequests)
    .innerJoin(claimUserAlias, eq(claimUserAlias.id, cardClaimRequests.fromUserId))
    .innerJoin(familyMembers, eq(familyMembers.id, cardClaimRequests.familyMemberId))
    .where(and(
      eq(cardClaimRequests.parentUserId, userId),
      eq(cardClaimRequests.status, 'pending'),
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

// ─── Respond to link request ───────────────────────────────────────────────────

aivitaFamilyRouter.post(
  '/link-request/:id/respond',
  zValidator('json', z.object({ action: z.enum(['accept', 'reject']) })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id } = c.req.param();
    const { action } = c.req.valid('json');

    const [request] = await db
      .select()
      .from(familyLinkRequests)
      .where(and(
        eq(familyLinkRequests.id, id),
        eq(familyLinkRequests.toUserId, userId),
        eq(familyLinkRequests.status, 'pending'),
      ))
      .limit(1);

    if (!request) return c.json({ error: 'Not found or already resolved' }, 404);

    await db.update(familyLinkRequests)
      .set({ status: action === 'accept' ? 'accepted' : 'rejected', updatedAt: new Date() })
      .where(eq(familyLinkRequests.id, id));

    if (action === 'accept') {
      await db.update(familyMembers)
        .set({ memberUserId: userId, inviteStatus: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
        .where(eq(familyMembers.id, request.familyMemberId));
    } else {
      await db.update(familyMembers)
        .set({ inviteStatus: 'rejected', updatedAt: new Date() })
        .where(eq(familyMembers.id, request.familyMemberId));
    }

    return c.json({ data: { ok: true } });
  }
);

// ─── Respond to card claim request (parent side) ──────────────────────────────

aivitaFamilyRouter.post(
  '/claim-request/:id/respond',
  zValidator('json', z.object({ action: z.enum(['approve', 'reject']) })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id } = c.req.param();
    const { action } = c.req.valid('json');

    const [claim] = await db
      .select({
        id: cardClaimRequests.id,
        fromUserId: cardClaimRequests.fromUserId,
        familyMemberId: cardClaimRequests.familyMemberId,
        cardNumber: familyMembers.cardNumber,
        heightCm: familyMembers.heightCm,
        weightKg: familyMembers.weightKg,
        bloodGroup: familyMembers.bloodGroup,
        rhFactor: familyMembers.rhFactor,
        allergies: familyMembers.allergies,
        chronicDiseases: familyMembers.chronicDiseases,
        childDiseases: familyMembers.childDiseases,
        vaccinations: familyMembers.vaccinations,
        medications: familyMembers.medications,
        memberBirthDate: familyMembers.memberBirthDate,
        memberGender: familyMembers.memberGender,
      })
      .from(cardClaimRequests)
      .innerJoin(familyMembers, eq(familyMembers.id, cardClaimRequests.familyMemberId))
      .where(and(
        eq(cardClaimRequests.id, id),
        eq(cardClaimRequests.parentUserId, userId),
        eq(cardClaimRequests.status, 'pending'),
      ))
      .limit(1);

    if (!claim) return c.json({ error: 'Not found' }, 404);

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.update(cardClaimRequests)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(cardClaimRequests.id, id));

    if (action === 'approve') {
      // Copy medical data to the new user's health profile
      const fromUserId = claim.fromUserId;

      await db.update(healthProfiles)
        .set({
          birthDate: claim.memberBirthDate ?? undefined,
          gender: claim.memberGender ?? undefined,
          heightCm: claim.heightCm ?? undefined,
          weightKg: claim.weightKg ? String(claim.weightKg) : undefined,
          bloodType: claim.bloodGroup ?? undefined,
          childDiseases: (claim.childDiseases as string[] | null) ?? undefined,
          vaccinationHistory: ((claim.vaccinations as Array<{ name: string; status: string; date?: string }> | null)
            ?? []).map(v => ({ name: v.name, status: v.status as 'done' | 'not_done' | 'unknown' })),
          updatedAt: new Date(),
        })
        .where(eq(healthProfiles.userId, fromUserId));

      // Update the medical card to use the child's card number (if possible)
      if (claim.cardNumber) {
        await db.update(medicalCards)
          .set({ cardCode: claim.cardNumber })
          .where(eq(medicalCards.userId, fromUserId));
      }

      // Mark family member as migrated
      await db.update(familyMembers)
        .set({
          migratedToUserId: fromUserId,
          migratedAt: new Date(),
          memberUserId: fromUserId,
          inviteStatus: 'accepted',
          updatedAt: new Date(),
        })
        .where(eq(familyMembers.id, claim.familyMemberId));

      // Insert allergies from child card
      const allergyList = (claim.allergies as string[] | null) ?? [];
      if (allergyList.length > 0) {
        await db.insert(allergies).values(
          allergyList.map(allergen => ({ userId: fromUserId, allergen, type: 'other' as const }))
        ).onConflictDoNothing();
      }

      // Insert chronic conditions
      const chronicList = (claim.chronicDiseases as string[] | null) ?? [];
      if (chronicList.length > 0) {
        await db.insert(chronicConditions).values(
          chronicList.map(name => ({ userId: fromUserId, name }))
        ).onConflictDoNothing();
      }
    } else {
      // Rejected — no data transfer
    }

    return c.json({ data: { ok: true, status: newStatus } });
  }
);

// ─── Create child medical card ─────────────────────────────────────────────────

aivitaFamilyRouter.post(
  '/child-card',
  zValidator('json', z.object({
    memberName: z.string().min(1),
    memberBirthDate: z.string().nullable().optional(),
    memberGender: z.string().nullable().optional(),
    memberRelation: z.string().optional().default('child'),
    heightCm: z.number().int().nullable().optional(),
    weightKg: z.number().nullable().optional(),
    bloodGroup: z.string().nullable().optional(),
    rhFactor: z.string().nullable().optional(),
    allergies: z.array(z.string()).default([]),
    chronicDiseases: z.array(z.string()).default([]),
    childDiseases: z.array(z.string()).default([]),
    vaccinations: z.array(z.object({
      name: z.string(),
      status: z.string(),
      date: z.string().optional(),
    })).default([]),
    medications: z.array(z.string()).default([]),
    parentNotes: z.string().nullable().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const cardNumber = await generateChildCardNumber();

    const [created] = await db.insert(familyMembers).values({
      ownerId: userId,
      memberName: body.memberName,
      memberRelation: body.memberRelation,
      memberBirthDate: body.memberBirthDate ?? null,
      memberGender: body.memberGender ?? null,
      cardNumber,
      heightCm: body.heightCm ?? null,
      weightKg: body.weightKg ? String(body.weightKg) : null,
      bloodGroup: body.bloodGroup ?? null,
      rhFactor: body.rhFactor ?? null,
      allergies: body.allergies,
      chronicDiseases: body.chronicDiseases,
      childDiseases: body.childDiseases,
      vaccinations: body.vaccinations,
      medications: body.medications,
      parentNotes: body.parentNotes ?? null,
      inviteStatus: 'accepted',
    }).returning();

    return c.json({ data: created }, 201);
  }
);

// ─── Get child card full data ──────────────────────────────────────────────────

aivitaFamilyRouter.get('/:id/card', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();

  const [row] = await db
    .select()
    .from(familyMembers)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.ownerId, userId), isNull(familyMembers.deletedAt)))
    .limit(1);

  if (!row) return c.json({ error: 'Not found' }, 404);

  // Enrich with vaccines list for the child's age
  const vaccines = getVaccinesByAge(row.memberBirthDate ?? null);

  return c.json({ data: { ...row, vaccineCalendar: vaccines } });
});

// ─── Update child card data ────────────────────────────────────────────────────

aivitaFamilyRouter.put(
  '/:id/card',
  zValidator('json', z.object({
    memberName: z.string().min(1).optional(),
    memberBirthDate: z.string().nullable().optional(),
    memberGender: z.string().nullable().optional(),
    heightCm: z.number().int().nullable().optional(),
    weightKg: z.number().nullable().optional(),
    bloodGroup: z.string().nullable().optional(),
    rhFactor: z.string().nullable().optional(),
    allergies: z.array(z.string()).optional(),
    chronicDiseases: z.array(z.string()).optional(),
    childDiseases: z.array(z.string()).optional(),
    vaccinations: z.array(z.object({ name: z.string(), status: z.string(), date: z.string().optional() })).optional(),
    medications: z.array(z.string()).optional(),
    parentNotes: z.string().nullable().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const update: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.weightKg !== undefined) update.weightKg = body.weightKg ? String(body.weightKg) : null;

    const [updated] = await db.update(familyMembers)
      .set(update)
      .where(and(eq(familyMembers.id, id), eq(familyMembers.ownerId, userId)))
      .returning();

    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: updated });
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
