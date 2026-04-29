import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { meals } from '@medsoft/db';
import { eq, and, gte, lte, desc, isNull } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaNutritionRouter = new Hono();

aivitaNutritionRouter.use('*', requireAivitaAuth);

// ─── List meals ────────────────────────────────────────────────────────────────
aivitaNutritionRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const dateFrom = c.req.query('from');
  const dateTo = c.req.query('to');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);

  const conditions = [eq(meals.userId, userId), isNull(meals.deletedAt)];
  if (dateFrom) conditions.push(gte(meals.date, dateFrom));
  if (dateTo) conditions.push(lte(meals.date, dateTo));

  const rows = await db.select().from(meals)
    .where(and(...conditions))
    .orderBy(desc(meals.consumedAt))
    .limit(limit);

  return c.json({ data: rows, total: rows.length });
});

// ─── Create meal ───────────────────────────────────────────────────────────────
aivitaNutritionRouter.post(
  '/',
  zValidator('json', z.object({
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    name: z.string().min(1),
    emoji: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    calories: z.string().or(z.number()).transform(String), // numeric DB type
    proteinG: z.string().or(z.number()).transform(String).optional(),
    fatG: z.string().or(z.number()).transform(String).optional(),
    carbsG: z.string().or(z.number()).transform(String).optional(),
    portionGrams: z.number().int().optional(),
    photoUrl: z.string().url().optional(),
    notes: z.string().optional(),
    consumedAt: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [created] = await db.insert(meals).values({
      userId,
      ...body,
      consumedAt: body.consumedAt ? new Date(body.consumedAt) : new Date(),
    }).returning();

    return c.json({ data: created }, 201);
  }
);

// ─── Update meal ───────────────────────────────────────────────────────────────
aivitaNutritionRouter.patch(
  '/:id',
  zValidator('json', z.object({
    name: z.string().min(1).optional(),
    calories: z.string().or(z.number()).transform(String).optional(),
    proteinG: z.string().or(z.number()).transform(String).optional(),
    fatG: z.string().or(z.number()).transform(String).optional(),
    carbsG: z.string().or(z.number()).transform(String).optional(),
    portionGrams: z.number().int().optional(),
    notes: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const [updated] = await db.update(meals)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(meals.id, id), eq(meals.userId, userId), isNull(meals.deletedAt)))
      .returning();

    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: updated });
  }
);

// ─── Delete meal ───────────────────────────────────────────────────────────────
aivitaNutritionRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const { id } = c.req.param();
  await db.update(meals)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(meals.id, id), eq(meals.userId, userId)));
  return c.json({ data: { deleted: true } });
});

// ─── Daily summary ─────────────────────────────────────────────────────────────
aivitaNutritionRouter.get('/summary', async (c) => {
  const userId = c.get('aivitaUserId');
  const date = c.req.query('date') ?? new Date().toISOString().split('T')[0];

  const todayMeals = await db.select().from(meals)
    .where(and(
      eq(meals.userId, userId),
      eq(meals.date, date),
      isNull(meals.deletedAt),
    ));

  const totals = todayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.proteinG ?? 0),
      fat: acc.fat + Number(m.fatG ?? 0),
      carbs: acc.carbs + Number(m.carbsG ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  return c.json({
    data: {
      date,
      totals,
      meals: todayMeals,
      count: todayMeals.length,
    },
  });
});
