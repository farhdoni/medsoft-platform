import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { vitals } from '@medsoft/db';
import { eq, and, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaVitalsRouter = new Hono();

aivitaVitalsRouter.use('*', requireAivitaAuth);

const VALID_TYPES = [
  'heart_rate', 'blood_pressure', 'blood_sugar', 'temperature',
  'weight', 'height', 'sleep_hours', 'water_ml', 'steps', 'spo2', 'respiratory_rate',
] as const;

type VitalType = (typeof VALID_TYPES)[number];

function getDefaultUnit(type: VitalType): string {
  const units: Record<VitalType, string> = {
    heart_rate: 'bpm',
    blood_pressure: 'mmHg',
    blood_sugar: 'mg/dL',
    temperature: '°C',
    weight: 'kg',
    height: 'cm',
    sleep_hours: 'hours',
    water_ml: 'ml',
    steps: 'steps',
    spo2: '%',
    respiratory_rate: 'rpm',
  };
  return units[type] ?? '';
}

// ─── GET /vitals/latest ────────────────────────────────────────────────────────

aivitaVitalsRouter.get('/latest', async (c) => {
  const userId = c.get('aivitaUserId');

  const latest: Record<string, unknown> = {};
  for (const type of VALID_TYPES) {
    const [row] = await db.select().from(vitals)
      .where(and(eq(vitals.userId, userId), eq(vitals.type, type)))
      .orderBy(desc(vitals.recordedAt))
      .limit(1);
    if (row) latest[type] = row;
  }

  return c.json({ data: latest });
});

// ─── GET /vitals/stats ─────────────────────────────────────────────────────────

aivitaVitalsRouter.get('/stats', async (c) => {
  const userId = c.get('aivitaUserId');
  const { type, period } = c.req.query();

  if (!type || !VALID_TYPES.includes(type as VitalType)) {
    return c.json({ error: 'Invalid or missing type' }, 400);
  }

  const days = period === 'month' ? 30 : period === 'year' ? 365 : 7;
  const from = new Date(Date.now() - days * 86400000);

  const rows = await db.select().from(vitals)
    .where(and(
      eq(vitals.userId, userId),
      eq(vitals.type, type),
      gte(vitals.recordedAt, from)
    ))
    .orderBy(asc(vitals.recordedAt));

  // Extract numeric values from the JSONB value field
  const values = rows
    .map((r) => {
      const v = r.value as Record<string, unknown>;
      return typeof v.value === 'number' ? v.value : null;
    })
    .filter((v): v is number => v !== null);

  const stats = {
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    count: rows.length,
    trend: values.length >= 2
      ? (values[values.length - 1] > values[0] ? 'up' : 'down')
      : 'stable',
    history: rows,
  };

  return c.json({ data: stats });
});

// ─── GET /vitals ───────────────────────────────────────────────────────────────

aivitaVitalsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const { from, to, type } = c.req.query();

  let conditions = [eq(vitals.userId, userId)];

  if (type && VALID_TYPES.includes(type as VitalType)) {
    conditions.push(eq(vitals.type, type));
  }
  if (from) {
    conditions.push(gte(vitals.recordedAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(vitals.recordedAt, new Date(to)));
  }

  const rows = await db.select().from(vitals)
    .where(and(...conditions))
    .orderBy(desc(vitals.recordedAt))
    .limit(100);

  return c.json({ data: rows });
});

// ─── POST /vitals ──────────────────────────────────────────────────────────────

const vitalSchema = z.object({
  type: z.enum(VALID_TYPES),
  value: z.record(z.unknown()), // JSONB: { value, unit } or { systolic, diastolic } or { hours }
  source: z.string().default('manual'),
  recordedAt: z.string().optional(),
  note: z.string().optional(),
});

aivitaVitalsRouter.post(
  '/',
  zValidator('json', vitalSchema),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');

    const [row] = await db.insert(vitals).values({
      userId,
      type: body.type,
      value: body.value,
      source: body.source,
      recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
    }).returning();

    return c.json({ data: row }, 201);
  }
);

// ─── POST /vitals/batch ────────────────────────────────────────────────────────

aivitaVitalsRouter.post(
  '/batch',
  zValidator('json', z.object({
    entries: z.array(vitalSchema),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { entries } = c.req.valid('json');

    const rows = await db.insert(vitals).values(
      entries.map((e) => ({
        userId,
        type: e.type,
        value: e.value,
        source: e.source,
        recordedAt: e.recordedAt ? new Date(e.recordedAt) : new Date(),
      }))
    ).returning();

    return c.json({ data: rows }, 201);
  }
);

// ─── DELETE /vitals/:id ────────────────────────────────────────────────────────

aivitaVitalsRouter.delete('/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id = c.req.param('id');

  await db.delete(vitals)
    .where(and(eq(vitals.id, id), eq(vitals.userId, userId)));

  return c.json({ data: { success: true } });
});
