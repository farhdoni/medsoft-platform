import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { meals, nutritionPlans, healthProfiles } from '@medsoft/db';
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

// ─── Recognize food from image (Claude Vision) ────────────────────────────────
aivitaNutritionRouter.post(
  '/recognize',
  zValidator('json', z.object({
    image: z.string().min(10), // base64 encoded image
  })),
  async (c) => {
    const { image } = c.req.valid('json');
    const key = process.env.ANTHROPIC_API_KEY;

    if (!key) {
      return c.json({
        data: {
          dishes: [
            { name: 'Тарелка еды', calories: 350, protein: 15, fat: 12, carbs: 45, weight_g: 250 },
          ],
          totalCalories: 350,
        },
      });
    }

    try {
      // Determine media type from base64 prefix
      let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
      if (image.startsWith('data:image/png')) mediaType = 'image/png';
      else if (image.startsWith('data:image/webp')) mediaType = 'image/webp';

      // Strip data URI prefix if present
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64Data },
              },
              {
                type: 'text',
                text: `Определи блюда на фото и верни ТОЛЬКО JSON без markdown:
{
  "dishes": [
    {"name": "Название", "calories": number, "protein": number, "fat": number, "carbs": number, "weight_g": number}
  ]
}
Пиши названия по-русски. Оценивай калории на порцию (не на 100г).`,
              },
            ],
          }],
        }),
      });

      if (!resp.ok) throw new Error('Claude API error');
      const data = await resp.json() as { content: Array<{ type: string; text: string }> };
      const raw = data.content?.[0]?.text ?? '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned) as { dishes: Array<{ name: string; calories: number; protein: number; fat: number; carbs: number; weight_g: number }> };

      const totalCalories = parsed.dishes.reduce((s, d) => s + (d.calories ?? 0), 0);
      return c.json({ data: { ...parsed, totalCalories } });
    } catch {
      return c.json({ error: 'Failed to recognize food' }, 500);
    }
  }
);

// ─── Generate nutrition plan (Claude AI) ──────────────────────────────────────
aivitaNutritionRouter.post(
  '/plan',
  zValidator('json', z.object({
    goal:         z.enum(['lose', 'gain', 'maintain']),
    restrictions: z.array(z.string()).optional().default([]),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { goal, restrictions } = c.req.valid('json');
    const key = process.env.ANTHROPIC_API_KEY;

    // Load health profile for context
    const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);

    const goalLabel = { lose: 'похудеть', gain: 'набрать вес', maintain: 'поддержать вес' }[goal];
    const profileCtx = profile
      ? `Рост: ${profile.heightCm ?? '?'} см, Вес: ${profile.weightKg ?? '?'} кг`
      : 'Данные профиля не указаны';

    const restrictStr = restrictions.length > 0 ? `Ограничения/аллергии: ${restrictions.join(', ')}` : '';

    const mockPlan = buildMockPlan(goal);

    if (!key) {
      await db.insert(nutritionPlans).values({ userId, goal, plan: mockPlan });
      return c.json({ data: { goal, plan: mockPlan } }, 201);
    }

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Составь план питания на неделю. Цель: ${goalLabel}. ${profileCtx}. ${restrictStr}

Верни ТОЛЬКО JSON без markdown:
{
  "Mon": {"breakfast": {"name": "...", "calories": 400}, "lunch": {"name": "...", "calories": 600}, "dinner": {"name": "...", "calories": 500}},
  "Tue": {...},
  "Wed": {...},
  "Thu": {...},
  "Fri": {...},
  "Sat": {...},
  "Sun": {...}
}
Пиши по-русски. Калории реалистичные. Блюда простые.`,
          }],
        }),
      });

      if (!resp.ok) throw new Error('Claude error');
      const data = await resp.json() as { content: Array<{ type: string; text: string }> };
      const raw = data.content?.[0]?.text ?? '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const plan = JSON.parse(cleaned) as Record<string, unknown>;

      await db.insert(nutritionPlans).values({ userId, goal, plan });
      return c.json({ data: { goal, plan } }, 201);
    } catch {
      await db.insert(nutritionPlans).values({ userId, goal, plan: mockPlan });
      return c.json({ data: { goal, plan: mockPlan } }, 201);
    }
  }
);

function buildMockPlan(goal: string) {
  const cal = goal === 'lose' ? { b: 350, l: 450, d: 400 } : goal === 'gain' ? { b: 550, l: 750, d: 650 } : { b: 450, l: 600, d: 500 };
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const menus = [
    { breakfast: 'Овсяная каша с фруктами', lunch: 'Куриный суп с овощами', dinner: 'Запечённая рыба с рисом' },
    { breakfast: 'Яичница с тостом', lunch: 'Греческий салат с курицей', dinner: 'Говяжий стейк с гречкой' },
    { breakfast: 'Творог с ягодами', lunch: 'Борщ со сметаной', dinner: 'Паста с томатным соусом' },
    { breakfast: 'Блины с мёдом', lunch: 'Тушёные овощи с мясом', dinner: 'Омлет с сыром' },
    { breakfast: 'Гранола с йогуртом', lunch: 'Рыбный суп', dinner: 'Куриная грудка с овощами' },
    { breakfast: 'Сырники', lunch: 'Пилав', dinner: 'Овощное рагу с говядиной' },
    { breakfast: 'Каша пшённая с тыквой', lunch: 'Манты', dinner: 'Запечённые овощи с курицей' },
  ];
  return Object.fromEntries(days.map((d, i) => [
    d,
    {
      breakfast: { name: menus[i].breakfast, calories: cal.b },
      lunch:     { name: menus[i].lunch,     calories: cal.l },
      dinner:    { name: menus[i].dinner,    calories: cal.d },
    },
  ]));
}

// ─── Get latest nutrition plan ────────────────────────────────────────────────
aivitaNutritionRouter.get('/plan', async (c) => {
  const userId = c.get('aivitaUserId');
  const [plan] = await db.select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.userId, userId))
    .orderBy(desc(nutritionPlans.createdAt))
    .limit(1);
  return c.json({ data: plan ?? null });
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
