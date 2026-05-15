/**
 * Outbreak monitoring — public endpoints (no auth) + authed symptom reporting.
 *
 * Public:
 *   GET /v1/aivita/outbreak/map     → [{city, lat, lon, diseaseCategory, activeCases, trend, color, size}]
 *   GET /v1/aivita/outbreak/summary → [{diseaseCategory, totalCases}]
 *
 * Authed:
 *   POST /v1/aivita/symptoms/report → create a symptom report
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import { symptomReports, healthProfiles } from '@medsoft/db';
import { eq, gte, sql, and } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

// ─── City coordinates ──────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Ташкент':   { lat: 41.2995, lon: 69.2401 },
  'Фергана':   { lat: 40.3777, lon: 71.7798 },
  'Самарканд': { lat: 39.6270, lon: 66.9750 },
  'Ургенч':    { lat: 41.5500, lon: 60.6333 },
  'Андижан':   { lat: 40.7821, lon: 72.3442 },
  'Наманган':  { lat: 41.0011, lon: 71.6728 },
  'Бухара':    { lat: 39.7681, lon: 64.4556 },
  'Нукус':     { lat: 42.4526, lon: 59.6100 },
  'Карши':     { lat: 38.8600, lon: 65.7897 },
  'Термез':    { lat: 37.2240, lon: 67.2780 },
};

// ─── Disease category → label ──────────────────────────────────────────────────

const DISEASE_LABELS: Record<string, string> = {
  orvi:       'ОРВИ',
  measles:    'Корь',
  hepatitis:  'Гепатит',
  intestinal: 'Кишечные инфекции',
  flu:        'Грипп',
  other:      'Прочие инфекции',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function caseColor(n: number): string {
  if (n > 200) return '#ef4444';  // red
  if (n > 100) return '#f97316';  // orange
  if (n > 50)  return '#eab308';  // yellow
  if (n > 20)  return '#22c55e';  // green
  return '#3b82f6';               // blue
}

function caseSize(n: number): number {
  if (n > 200) return 7;
  if (n > 100) return 6;
  if (n > 50)  return 5;
  if (n > 20)  return 3.5;
  return 2.5;
}

const THIRTY_DAYS  = () => new Date(Date.now() - 30 * 86_400_000);
const SEVEN_DAYS   = () => new Date(Date.now() -  7 * 86_400_000);
const FOURTEEN_DAYS= () => new Date(Date.now() - 14 * 86_400_000);

// ─── Routers ───────────────────────────────────────────────────────────────────

export const outbreakRouter   = new Hono(); // public
export const symptomsRouter   = new Hono(); // authed

symptomsRouter.use('*', requireAivitaAuth);

// ─── POST /symptoms/report ─────────────────────────────────────────────────────

symptomsRouter.post(
  '/report',
  zValidator('json', z.object({
    city:            z.string().min(1).max(50),
    symptomType:     z.enum(['fever','cough','diarrhea','rash','headache','vomiting','sore_throat']),
    temperature:     z.number().min(35).max(43).optional(),
    diseaseCategory: z.enum(['orvi','measles','hepatitis','intestinal','flu','other']).optional(),
    severity:        z.enum(['mild','moderate','severe']).optional(),
    source:          z.enum(['checkup','vitals','manual','ai_chat']).default('manual'),
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const body   = c.req.valid('json');

    const [row] = await db.insert(symptomReports).values({
      userId,
      city:            body.city,
      symptomType:     body.symptomType,
      temperature:     body.temperature?.toString(),
      diseaseCategory: body.diseaseCategory,
      severity:        body.severity,
      source:          body.source,
    }).returning();

    return c.json({ data: row }, 201);
  }
);

// ─── GET /outbreak/map ─────────────────────────────────────────────────────────

outbreakRouter.get('/map', async (c) => {
  const since30 = THIRTY_DAYS();
  const since7  = SEVEN_DAYS();
  const since14 = FOURTEEN_DAYS();

  // Aggregate last 30 days
  const rows = await db
    .select({
      city:            symptomReports.city,
      diseaseCategory: symptomReports.diseaseCategory,
      activeCases:     sql<number>`COUNT(*)::int`,
    })
    .from(symptomReports)
    .where(gte(symptomReports.reportedAt, since30))
    .groupBy(symptomReports.city, symptomReports.diseaseCategory);

  // Last 7 days per city+category
  const recent7 = await db
    .select({
      city:            symptomReports.city,
      diseaseCategory: symptomReports.diseaseCategory,
      cnt:             sql<number>`COUNT(*)::int`,
    })
    .from(symptomReports)
    .where(gte(symptomReports.reportedAt, since7))
    .groupBy(symptomReports.city, symptomReports.diseaseCategory);

  // Previous 7 days (day -14 to day -7)
  const prev7 = await db
    .select({
      city:            symptomReports.city,
      diseaseCategory: symptomReports.diseaseCategory,
      cnt:             sql<number>`COUNT(*)::int`,
    })
    .from(symptomReports)
    .where(
      and(
        gte(symptomReports.reportedAt, since14),
        sql`${symptomReports.reportedAt} < ${since7.toISOString()}`
      )
    )
    .groupBy(symptomReports.city, symptomReports.diseaseCategory);

  // Build lookup maps
  const r7Map  = new Map(recent7.map(r => [`${r.city}|${r.diseaseCategory}`, r.cnt]));
  const p7Map  = new Map(prev7.map(r  => [`${r.city}|${r.diseaseCategory}`, r.cnt]));

  // Filter out groups < 5 cases (anonymization), map to output format
  const points = rows
    .filter(r => r.activeCases >= 5 && r.diseaseCategory)
    .map(r => {
      const key = `${r.city}|${r.diseaseCategory}`;
      const rCnt = r7Map.get(key) ?? 0;
      const pCnt = p7Map.get(key) ?? 1; // avoid /0
      const ratio = rCnt / pCnt;
      const trend = ratio > 1.1 ? 'rising' : ratio < 0.9 ? 'falling' : 'stable';

      const coords = CITY_COORDS[r.city] ?? { lat: 41.3, lon: 64.6 };
      return {
        city:            r.city,
        lat:             coords.lat,
        lon:             coords.lon,
        diseaseCategory: r.diseaseCategory,
        diseaseLabel:    DISEASE_LABELS[r.diseaseCategory ?? ''] ?? r.diseaseCategory,
        activeCases:     r.activeCases,
        trend,
        color:           caseColor(r.activeCases),
        size:            caseSize(r.activeCases),
      };
    });

  // Cache 30 min
  c.header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
  return c.json({ data: points, updatedAt: new Date().toISOString() });
});

// ─── GET /outbreak/summary ─────────────────────────────────────────────────────

outbreakRouter.get('/summary', async (c) => {
  const since30 = THIRTY_DAYS();

  const rows = await db
    .select({
      diseaseCategory: symptomReports.diseaseCategory,
      totalCases:      sql<number>`COUNT(*)::int`,
    })
    .from(symptomReports)
    .where(gte(symptomReports.reportedAt, since30))
    .groupBy(symptomReports.diseaseCategory)
    .orderBy(sql`COUNT(*) DESC`);

  const data = rows
    .filter(r => r.diseaseCategory)
    .map(r => ({
      diseaseCategory: r.diseaseCategory,
      diseaseLabel:    DISEASE_LABELS[r.diseaseCategory ?? ''] ?? r.diseaseCategory,
      totalCases:      r.totalCases,
    }));

  c.header('Cache-Control', 'public, max-age=1800');
  return c.json({ data, updatedAt: new Date().toISOString() });
});

// ─── Utility: auto-report from checkup (called from checkup.ts) ───────────────

/**
 * Maps a checkup problem title/description to a disease category.
 * Used when auto-creating symptom_reports from checkup results.
 */
export function inferDiseaseCategory(title: string, desc: string): string {
  const t = (title + ' ' + desc).toLowerCase();
  if (t.includes('корь') || t.includes('measles') || t.includes('сыпь')) return 'measles';
  if (t.includes('гепатит') || t.includes('hepatit') || t.includes('желт')) return 'hepatitis';
  if (t.includes('кишечн') || t.includes('диарея') || t.includes('отравлен') || t.includes('рвота')) return 'intestinal';
  if (t.includes('грипп') || t.includes('flu') || t.includes('influenza')) return 'flu';
  if (t.includes('орви') || t.includes('простуд') || t.includes('насмор') || t.includes('кашл')) return 'orvi';
  return 'other';
}

/**
 * Create a symptom report silently — used internally by checkup & vitals routes.
 * Never throws; errors are suppressed to avoid blocking the parent request.
 */
export async function autoReport(params: {
  userId:          string;
  city:            string;
  symptomType:     string;
  temperature?:    number;
  diseaseCategory: string;
  severity:        string;
  source:          'checkup' | 'vitals' | 'ai_chat';
}): Promise<void> {
  try {
    await db.insert(symptomReports).values({
      userId:          params.userId,
      city:            params.city,
      symptomType:     params.symptomType,
      temperature:     params.temperature?.toString(),
      diseaseCategory: params.diseaseCategory,
      severity:        params.severity,
      source:          params.source,
    });
  } catch {
    // silently swallow — monitoring should never break core flows
  }
}
