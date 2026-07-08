import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { vitals, userDevices } from '@medsoft/db';
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { analyzeHealthChange } from '../../lib/health-monitor.js';
import { autoReport } from './outbreak.js';
import { healthProfiles } from '@medsoft/db';
import { getUserTimezone } from '../../lib/user-timezone.js';
import { parseDateBoundary } from '../../lib/timezone.js';

export const aivitaVitalsRouter = new Hono();

aivitaVitalsRouter.use('*', requireAivitaAuth);

const VALID_TYPES = [
  'heart_rate', 'blood_pressure', 'blood_sugar', 'temperature',
  'weight', 'height', 'sleep_hours', 'water_ml', 'steps', 'spo2', 'respiratory_rate',
  // Health Connect full biometrics
  'sleep', 'calories', 'active_calories', 'distance', 'resting_heart_rate',
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
    sleep: 'min',
    calories: 'kcal',
    active_calories: 'kcal',
    distance: 'km',
    resting_heart_rate: 'bpm',
  };
  return units[type] ?? '';
}

// Types whose recorded_at is normalized to midnight UTC before insert so that
// a single UNIQUE(user_id, type, recorded_at) deduplicates daily aggregates.
// HC re-syncs throughout the day → dedupe daily totals for these types.
const DAILY_AGGREGATE_TYPES = new Set<VitalType>([
  'steps', 'sleep_hours', 'water_ml',
  'sleep', 'calories', 'active_calories', 'distance',
]);

function normalizeRecordedAt(type: VitalType, date: Date): Date {
  if (!DAILY_AGGREGATE_TYPES.has(type)) return date;
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
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
// Single request returns all types aggregated in SQL — no JS min/max/avg loops,
// no history rows in the response.

type BucketRow = {
  type: string;
  bucket: Date;
  bucket_avg: string | null;
  bucket_cnt: string;
  total_min: string | null;
  total_max: string | null;
  total_avg: string | null;
  total_cnt: string;
};

function formatBucketLabel(bucket: Date, period: string | undefined): string {
  const d = new Date(bucket);
  if (period === 'year') return d.toLocaleDateString('ru', { month: 'short' });
  if (period === 'month') return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'numeric' });
}

aivitaVitalsRouter.get('/stats', async (c) => {
  const userId = c.get('aivitaUserId');
  const { period } = c.req.query();

  const days = period === 'month' ? 30 : period === 'year' ? 365 : 7;
  const from = new Date(Date.now() - days * 86400000).toISOString();
  const trunc = period === 'year' ? 'month' : period === 'month' ? 'week' : 'day';

  // One CTE-based query: bucket aggregates + overall stats per type, all types in one scan.
  // COALESCE handles blood_pressure (systolic/diastolic) alongside standard {value} shape.
  const sqlRows = await db.execute(sql`
    WITH base AS (
      SELECT
        type,
        date_trunc(${trunc}, recorded_at) AS bucket,
        COALESCE(
          ((value#>>'{}')::jsonb->>'value')::numeric,
          ((value#>>'{}')::jsonb->>'systolic')::numeric
        ) AS val
      FROM vitals
      WHERE user_id = ${userId}
        AND recorded_at >= ${from}
    ),
    bucket_agg AS (
      SELECT type, bucket,
        AVG(val)   AS bucket_avg,
        COUNT(*)   AS bucket_cnt
      FROM base
      GROUP BY type, bucket
    ),
    overall_agg AS (
      SELECT type,
        MIN(val)    AS total_min,
        MAX(val)    AS total_max,
        AVG(val)    AS total_avg,
        COUNT(val)  AS total_cnt
      FROM base
      GROUP BY type
    )
    SELECT
      ba.type,
      ba.bucket,
      ba.bucket_avg,
      ba.bucket_cnt,
      oa.total_min,
      oa.total_max,
      oa.total_avg,
      oa.total_cnt
    FROM bucket_agg ba
    JOIN overall_agg oa ON ba.type = oa.type
    ORDER BY ba.type, ba.bucket ASC
  `);

  // Group SQL rows by vital type
  const byType = new Map<string, BucketRow[]>();
  for (const row of sqlRows as unknown as BucketRow[]) {
    const list = byType.get(row.type) ?? [];
    list.push(row);
    byType.set(row.type, list);
  }

  const data: Record<string, unknown> = {};
  for (const type of VALID_TYPES) {
    const buckets = byType.get(type) ?? [];
    if (buckets.length === 0) {
      data[type] = { min: null, max: null, avg: null, count: 0, trend: 'stable', buckets: [] };
      continue;
    }

    const first = buckets[0];
    const min   = first.total_min  != null ? parseFloat(first.total_min)  : null;
    const max   = first.total_max  != null ? parseFloat(first.total_max)  : null;
    const avg   = first.total_avg  != null ? parseFloat(first.total_avg)  : null;
    const count = parseInt(first.total_cnt, 10);

    const bucketVals = buckets
      .map(b => b.bucket_avg != null ? parseFloat(b.bucket_avg) : null)
      .filter((v): v is number => v !== null);
    const trend: 'up' | 'down' | 'stable' = bucketVals.length >= 2
      ? (bucketVals[bucketVals.length - 1] > bucketVals[0] ? 'up' : 'down')
      : 'stable';

    const formattedBuckets = buckets.map(b => ({
      label: formatBucketLabel(new Date(b.bucket), period),
      value: b.bucket_avg != null ? Math.round(parseFloat(b.bucket_avg) * 10) / 10 : 0,
    }));

    data[type] = { min, max, avg, count, trend, buckets: formattedBuckets };
  }

  return c.json({ data });
});

// ─── GET /vitals ───────────────────────────────────────────────────────────────

aivitaVitalsRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  const { from, to, type } = c.req.query();
  const limitRaw = c.req.query('limit');
  const offsetRaw = c.req.query('offset');

  // Pagination mode: ?limit=N → returns { items, total, hasMore }.
  // Without limit → legacy { data: rows } with hard cap 100 (SSR + handleSaved callers).
  const paginated = limitRaw !== undefined;
  const limit  = paginated ? Math.min(50, Math.max(1, Number(limitRaw) || 20)) : 100;
  const offset = paginated ? Math.max(0, Number(offsetRaw ?? '0') || 0) : 0;

  let conditions = [eq(vitals.userId, userId)];

  if (type && VALID_TYPES.includes(type as VitalType)) {
    conditions.push(eq(vitals.type, type));
  }
  // Bare `YYYY-MM-DD` from/to mean the user's LOCAL day (see parseDateBoundary);
  // full ISO instants pass through unchanged.
  if (from || to) {
    const tz = await getUserTimezone(userId);
    if (from) conditions.push(gte(vitals.recordedAt, parseDateBoundary(from, tz)));
    if (to) conditions.push(lte(vitals.recordedAt, parseDateBoundary(to, tz, { endOfDay: true })));
  }

  if (paginated) {
    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(vitals)
      .where(and(...conditions));

    const rows = await db.select().from(vitals)
      .where(and(...conditions))
      .orderBy(desc(vitals.recordedAt))
      .limit(limit)
      .offset(offset);

    return c.json({ items: rows, total, hasMore: offset + rows.length < total });
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

    let row: typeof vitals.$inferSelect;
    try {
      const [inserted] = await db.insert(vitals).values({
        userId,
        type: body.type,
        value: body.value as { value: number; unit: string } | { systolic: number; diastolic: number } | { hours: number; quality?: 'poor' | 'ok' | 'good' },
        source: body.source,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
      }).returning();
      row = inserted;
    } catch (err) {
      console.error('[vitals POST] DB insert error:', err);
      return c.json({ error: 'db_error', message: 'Не удалось сохранить показатель. Попробуйте ещё раз.' }, 500);
    }

    // AI monitor: analyze vital value for anomalies
    let aiRecommendation = null;
    try {
      const v = body.value as Record<string, unknown>;
      if (body.type === 'blood_pressure' && typeof v.systolic === 'number') {
        const sysAnalysis = analyzeHealthChange('systolic', v.systolic);
        const diaAnalysis = typeof v.diastolic === 'number' ? analyzeHealthChange('diastolic', v.diastolic) : { level: 'none' as const };
        const worst = sysAnalysis.level === 'critical' || diaAnalysis.level === 'critical'
          ? (sysAnalysis.level === 'critical' ? sysAnalysis : diaAnalysis)
          : (sysAnalysis.level === 'important' ? sysAnalysis : diaAnalysis);
        if (worst.level !== 'none') aiRecommendation = worst;
      } else if (typeof v.value === 'number') {
        const analysis = analyzeHealthChange(body.type, v.value);
        if (analysis.level !== 'none') aiRecommendation = analysis;
      }
    } catch {
      // Analysis errors should not block the response
    }

    // ── Auto-report fever to outbreak monitoring ─────────────────────────────
    if (body.type === 'temperature') {
      const tempVal = typeof (body.value as Record<string,unknown>).value === 'number'
        ? (body.value as { value: number }).value
        : null;
      if (tempVal != null && tempVal > 37.5) {
        try {
          const profile = await db.query.healthProfiles.findFirst({ where: eq(healthProfiles.userId, userId) });
          void autoReport({
            userId,
            city:            (profile as { city?: string } | undefined)?.city ?? 'Ташкент',
            symptomType:     'fever',
            temperature:     tempVal,
            diseaseCategory: tempVal > 39 ? 'flu' : 'orvi',
            severity:        tempVal > 39 ? 'severe' : tempVal > 38 ? 'moderate' : 'mild',
            source:          'vitals',
          });
        } catch {
          // Don't block response on fever reporting errors
        }
      }
    }

    return c.json({ data: row, aiRecommendation }, 201);
  }
);

// ─── POST /vitals/batch ────────────────────────────────────────────────────────

// Backward-compat wire format. The Health Connect sync in the mobile app posts
// `{ vitals: [...] }` with `recorded_at` and value shapes like { count } (steps)
// or { bpm } (heart rate). The canonical format used everywhere else is
// `{ entries: [...] }` with `recordedAt` and { value, unit }. Accept BOTH so
// already-shipped APKs sync without a rebuild, and normalize the value so the
// data is actually read downstream (Биометрия / health-monitor / nutrition all
// read value.value).

const batchEntrySchema = z.object({
  type: z.enum(VALID_TYPES),
  value: z.record(z.unknown()),
  source: z.string().default('manual'),
  recordedAt: z.string().optional(),
  recorded_at: z.string().optional(), // snake_case alias (Health Connect)
  note: z.string().optional(),
});

type CanonicalVitalValue =
  | { value: number; unit: string }
  | { systolic: number; diastolic: number }
  | { hours: number; quality?: 'poor' | 'ok' | 'good' };

/**
 * Normalize an incoming vital value to the canonical { value, unit } shape that
 * the rest of the app reads. Health Connect sends { count } for steps and
 * { bpm } for heart rate; convert those. Leave already-canonical values and
 * structured values ({systolic,diastolic}, {hours}) untouched.
 */
function normalizeVitalValue(type: VitalType, value: Record<string, unknown>): CanonicalVitalValue {
  if (typeof value.value === 'number') return value as CanonicalVitalValue;
  if (typeof value.count === 'number') return { value: value.count, unit: getDefaultUnit(type) };
  if (typeof value.bpm === 'number') return { value: value.bpm, unit: getDefaultUnit(type) };
  // Health Connect OxygenSaturation sends { percentage } → SpO2 canonical { value, unit:'%' }.
  if (typeof value.percentage === 'number') return { value: value.percentage, unit: getDefaultUnit(type) };
  // Health Connect full biometrics set:
  //   sleep { minutes }, calories/active_calories { kcal }, distance { km }
  if (typeof value.minutes === 'number') return { value: value.minutes, unit: getDefaultUnit(type) };
  if (typeof value.kcal === 'number') return { value: value.kcal, unit: getDefaultUnit(type) };
  if (typeof value.km === 'number') return { value: value.km, unit: getDefaultUnit(type) };
  // Structured manual-entry values pass through untouched.
  return value as CanonicalVitalValue;
}

aivitaVitalsRouter.post(
  '/batch',
  zValidator('json', z.object({
    entries: z.array(batchEntrySchema).optional(),
    vitals: z.array(batchEntrySchema).optional(), // alias used by the mobile HC sync
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body = c.req.valid('json');
    const items = body.entries ?? body.vitals ?? [];

    if (items.length === 0) {
      return c.json(
        { error: 'No vital entries provided (expected non-empty "entries" or "vitals" array)' },
        400,
      );
    }

    const rows = await db.insert(vitals).values(
      items.map((e) => {
        const recordedAtRaw = e.recordedAt ?? e.recorded_at;
        const recordedAt = normalizeRecordedAt(
          e.type,
          recordedAtRaw ? new Date(recordedAtRaw) : new Date(),
        );
        return {
          userId,
          type: e.type,
          value: normalizeVitalValue(e.type, e.value),
          source: e.source,
          recordedAt,
        };
      })
    )
    .onConflictDoUpdate({
      target: [vitals.userId, vitals.type, vitals.recordedAt],
      // On re-sync: update value (aggregate may have grown) and source.
      // createdAt is intentionally omitted — preserve original insert time.
      set: {
        value: sql`excluded.value`,
        source: sql`excluded.source`,
      },
    })
    .returning();

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

// ─── GET /vitals/hc-sync-state ────────────────────────────────────────────────

aivitaVitalsRouter.get('/hc-sync-state', async (c) => {
  const userId = c.get('aivitaUserId');

  const [device] = await db
    .select({
      status: userDevices.status,
      hcChangesToken: userDevices.hcChangesToken,
      hcLastSyncAt: userDevices.hcLastSyncAt,
    })
    .from(userDevices)
    .where(and(eq(userDevices.userId, userId), eq(userDevices.type, 'health_connect')))
    .limit(1);

  return c.json({
    data: {
      status: device?.status ?? null,
      hcChangesToken: device?.hcChangesToken ?? null,
      hcLastSyncAt: device?.hcLastSyncAt ?? null,
    },
  });
});

// ─── PUT /vitals/hc-sync-state ────────────────────────────────────────────────

const hcSyncStateSchema = z.object({
  hcChangesToken: z.string().nullable(),
  hcLastSyncAt: z.string().datetime().nullable(),
});

aivitaVitalsRouter.put(
  '/hc-sync-state',
  zValidator('json', hcSyncStateSchema),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { hcChangesToken, hcLastSyncAt } = c.req.valid('json');

    await db
      .insert(userDevices)
      .values({
        userId,
        type: 'health_connect',
        name: 'Health Connect',
        status: 'connected',
        hcChangesToken,
        hcLastSyncAt: hcLastSyncAt ? new Date(hcLastSyncAt) : null,
      })
      .onConflictDoUpdate({
        target: [userDevices.userId, userDevices.type],
        set: {
          // Re-affirm connection on every persist — without this the status of a
          // pre-existing row stays stale and the web card can't restore 'connected'.
          status: 'connected',
          hcChangesToken,
          hcLastSyncAt: hcLastSyncAt ? new Date(hcLastSyncAt) : null,
        },
      });

    return c.json({ data: { ok: true } });
  }
);
