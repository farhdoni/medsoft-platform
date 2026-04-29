import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { habits, habitLogs } from '@medsoft/db';
import { eq, and, isNull, desc, gte, lte } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaHabitsRouter = new Hono();

aivitaHabitsRouter.use('*', requireAivitaAuth);

// ─── List habits ───────────────────────────────────────────────────────────────
aivitaHabitsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const rows = await db.select().from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(habits.createdAt);
  return c.json({ data: rows });
});

// ─── Create habit ──────────────────────────────────────────────────────────────
aivitaHabitsRouter.post(
  '/',
  zValidator('json', z.object({
    name: z.string().min(1).max(100),
    emoji: z.string().optional(),
    category: z.string().optional(),
    goalType: z.enum(['count', 'duration_minutes', 'volume_ml', 'binary']).default('binary'),
    goalValue: z.string().optional(),
    goalUnit: z.string().optional(),
    frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
    reminderTime: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const [created] = await db.insert(habits)
      .values({ userId, ...body })
      .returning();
    return c.json({ data: created }, 201);
  }
);

// ─── Update habit ──────────────────────────────────────────────────────────────
aivitaHabitsRouter.patch(
  '/:id',
  zValidator('json', z.object({
    name: z.string().min(1).max(100).optional(),
    emoji: z.string().optional(),
    category: z.string().optional(),
    goalType: z.enum(['count', 'duration_minutes', 'volume_ml', 'binary']).optional(),
    goalValue: z.string().optional(),
    goalUnit: z.string().optional(),
    frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
    reminderTime: z.string().optional(),
    isActive: z.boolean().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const [updated] = await db.update(habits)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();

    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: updated });
  }
);

// ─── Archive habit ─────────────────────────────────────────────────────────────
aivitaHabitsRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(habits)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
  return c.json({ data: { archived: true } });
});

// ─── Habit logs ────────────────────────────────────────────────────────────────
aivitaHabitsRouter.get('/:id/logs', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  const dateFrom = c.req.query('from');
  const dateTo = c.req.query('to');

  const conditions = [
    eq(habitLogs.habitId, id),
    eq(habitLogs.userId, userId),
  ];
  if (dateFrom) conditions.push(gte(habitLogs.date, dateFrom));
  if (dateTo) conditions.push(lte(habitLogs.date, dateTo));

  const logs = await db.select().from(habitLogs)
    .where(and(...conditions))
    .orderBy(desc(habitLogs.date))
    .limit(60);

  return c.json({ data: logs });
});

aivitaHabitsRouter.post(
  '/:id/logs',
  zValidator('json', z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    value: z.string().optional(), // numeric string matching DB type
    unit: z.string().optional(),
    notes: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id: habitId } = c.req.param();
    const body = c.req.valid('json');

    // Upsert by habit+date
    const existing = await db.query.habitLogs.findFirst({
      where: and(
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.userId, userId),
        eq(habitLogs.date, body.date),
      ),
    });

    if (existing) {
      const [updated] = await db.update(habitLogs)
        .set({ value: body.value, unit: body.unit, notes: body.notes })
        .where(eq(habitLogs.id, existing.id))
        .returning();
      return c.json({ data: updated });
    }

    const [created] = await db.insert(habitLogs).values({
      habitId,
      userId,
      date: body.date,
      value: body.value,
      unit: body.unit,
      notes: body.notes,
    }).returning();

    return c.json({ data: created }, 201);
  }
);

// ─── All logs (for a user, by date range) ─────────────────────────────────────
aivitaHabitsRouter.get('/logs/range', async (c) => {
  const userId = c.get('aivitaUserId');
  const dateFrom = c.req.query('from');
  const dateTo = c.req.query('to');

  const conditions = [eq(habitLogs.userId, userId)];
  if (dateFrom) conditions.push(gte(habitLogs.date, dateFrom));
  if (dateTo) conditions.push(lte(habitLogs.date, dateTo));

  const logs = await db.select().from(habitLogs)
    .where(and(...conditions))
    .orderBy(desc(habitLogs.date))
    .limit(200);

  return c.json({ data: logs });
});
