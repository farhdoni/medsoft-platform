import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  healthProfiles, chronicConditions, allergies, medicalHistory, medications,
} from '@medsoft/db';
import { eq, isNull, and } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaHealthProfileRouter = new Hono();

aivitaHealthProfileRouter.use('*', requireAivitaAuth);

// ─── Health Profile ────────────────────────────────────────────────────────────
aivitaHealthProfileRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const profile = await db.query.healthProfiles.findFirst({
    where: eq(healthProfiles.userId, userId),
  });
  return c.json({ data: profile ?? null });
});

aivitaHealthProfileRouter.put(
  '/',
  zValidator('json', z.object({
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    bloodType: z.string().optional(),
    heightCm: z.number().int().min(50).max(300).optional(),
    weightKg: z.string().optional(),
    pinfl: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    smokingStatus: z.string().optional(),
    alcoholFrequency: z.string().optional(),
    exerciseFrequency: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const existing = await db.query.healthProfiles.findFirst({
      where: eq(healthProfiles.userId, userId),
    });

    if (existing) {
      const [updated] = await db.update(healthProfiles)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(healthProfiles.userId, userId))
        .returning();
      return c.json({ data: updated });
    } else {
      const [created] = await db.insert(healthProfiles)
        .values({ userId, ...body })
        .returning();
      return c.json({ data: created }, 201);
    }
  }
);

// ─── Chronic Conditions ────────────────────────────────────────────────────────
aivitaHealthProfileRouter.get('/chronic-conditions', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(chronicConditions)
    .where(and(eq(chronicConditions.userId, userId), isNull(chronicConditions.deletedAt)));
  return c.json({ data: rows });
});

aivitaHealthProfileRouter.post(
  '/chronic-conditions',
  zValidator('json', z.object({
    name: z.string().min(1),
    icd10Code: z.string().optional(),
    diagnosedYear: z.number().int().min(1900).max(2100).optional(),
    notes: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const [created] = await db.insert(chronicConditions)
      .values({ userId, ...body })
      .returning();
    return c.json({ data: created }, 201);
  }
);

aivitaHealthProfileRouter.delete('/chronic-conditions/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(chronicConditions)
    .set({ deletedAt: new Date() })
    .where(and(eq(chronicConditions.id, id), eq(chronicConditions.userId, userId)));
  return c.json({ data: { deleted: true } });
});

// ─── Allergies ─────────────────────────────────────────────────────────────────
aivitaHealthProfileRouter.get('/allergies', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(allergies)
    .where(and(eq(allergies.userId, userId), isNull(allergies.deletedAt)));
  return c.json({ data: rows });
});

aivitaHealthProfileRouter.post(
  '/allergies',
  zValidator('json', z.object({
    allergen: z.string().min(1),
    type: z.enum(['medication', 'food', 'material', 'other']),
    severity: z.enum(['mild', 'moderate', 'severe', 'anaphylaxis']).optional(),
    reaction: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const [created] = await db.insert(allergies)
      .values({ userId, ...body })
      .returning();
    return c.json({ data: created }, 201);
  }
);

aivitaHealthProfileRouter.delete('/allergies/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(allergies)
    .set({ deletedAt: new Date() })
    .where(and(eq(allergies.id, id), eq(allergies.userId, userId)));
  return c.json({ data: { deleted: true } });
});

// ─── Medical History ───────────────────────────────────────────────────────────
aivitaHealthProfileRouter.get('/medical-history', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(medicalHistory)
    .where(and(eq(medicalHistory.userId, userId), isNull(medicalHistory.deletedAt)));
  return c.json({ data: rows });
});

aivitaHealthProfileRouter.post(
  '/medical-history',
  zValidator('json', z.object({
    name: z.string().min(1),
    type: z.enum(['illness', 'surgery', 'injury', 'pregnancy', 'other']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    notes: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const [created] = await db.insert(medicalHistory)
      .values({ userId, ...body })
      .returning();
    return c.json({ data: created }, 201);
  }
);

aivitaHealthProfileRouter.delete('/medical-history/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(medicalHistory)
    .set({ deletedAt: new Date() })
    .where(and(eq(medicalHistory.id, id), eq(medicalHistory.userId, userId)));
  return c.json({ data: { deleted: true } });
});

// ─── Medications ───────────────────────────────────────────────────────────────
aivitaHealthProfileRouter.get('/medications', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(medications)
    .where(and(eq(medications.userId, userId), isNull(medications.deletedAt)));
  return c.json({ data: rows });
});

aivitaHealthProfileRouter.post(
  '/medications',
  zValidator('json', z.object({
    name: z.string().min(1),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    notes: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const [created] = await db.insert(medications)
      .values({ userId, ...body })
      .returning();
    return c.json({ data: created }, 201);
  }
);

aivitaHealthProfileRouter.delete('/medications/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(medications)
    .set({ deletedAt: new Date() })
    .where(and(eq(medications.id, id), eq(medications.userId, userId)));
  return c.json({ data: { deleted: true } });
});
