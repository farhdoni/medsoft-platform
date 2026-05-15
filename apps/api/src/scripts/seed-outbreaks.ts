/**
 * Seed script: generates 500-800 symptom_reports for the last 30 days.
 * Run via: npx tsx src/scripts/seed-outbreaks.ts
 *
 * City distribution:
 *   Ташкент   30 % (elevated measles)
 *   Фергана   25 % (elevated orvi)
 *   Самарканд 15 % (elevated hepatitis)
 *   Ургенч    10 % (elevated intestinal)
 *   Others     5 % each
 *
 * NOTE: The DB was already seeded via direct psql in development.
 * This script can be run again for reseed if needed.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { symptomReports } from '@medsoft/db';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL missing'); process.exit(1); }

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

// ── Config ────────────────────────────────────────────────────────────────────

type CityBias = [string, number, string[]]; // [city, weight, categories]

const CITY_BIASES: CityBias[] = [
  ['Ташкент',   30, ['measles','measles','orvi','orvi','flu','other']],
  ['Фергана',   25, ['orvi','orvi','flu','intestinal','measles']],
  ['Самарканд', 15, ['hepatitis','hepatitis','orvi','flu','other']],
  ['Ургенч',    10, ['intestinal','intestinal','orvi','hepatitis','flu']],
  ['Андижан',    5, ['orvi','flu','other','measles']],
  ['Наманган',   5, ['orvi','flu','intestinal','other']],
  ['Бухара',     5, ['orvi','hepatitis','measles','flu']],
  ['Нукус',      3, ['orvi','flu','other','intestinal']],
  ['Карши',      1, ['orvi','other','flu','intestinal']],
  ['Термез',     1, ['orvi','hepatitis','other','flu']],
];

const SYMPTOM_TYPES = ['fever','cough','diarrhea','rash','headache','vomiting','sore_throat'] as const;
const SEVERITIES    = ['mild','mild','mild','moderate','moderate','severe'] as const;
const SOURCES       = ['manual','vitals','checkup','ai_chat'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function pickWeighted(biases: CityBias[]): CityBias {
  const total = biases.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const b of biases) { r -= b[1]; if (r <= 0) return b; }
  return biases[biases.length - 1];
}

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function randomDate(maxDaysAgo: number): Date {
  // Cluster 45% of reports in last 7 days (to simulate rising trend)
  const recent = Math.random() < 0.45;
  const days = recent ? rand(0, 7) : rand(0, maxDaysAgo);
  const secs = rand(0, 86_400);
  return new Date(Date.now() - days * 86_400_000 - secs * 1000);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Check existing count
  const [{ cnt }] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(symptomReports);
  if (cnt >= 100) {
    console.log(`Already seeded (${cnt} records). Skipping.`);
    await client.end();
    return;
  }

  const total = rand(500, 800);
  console.log(`Seeding ${total} symptom reports…`);

  const rows: (typeof symptomReports.$inferInsert)[] = [];

  for (let i = 0; i < total; i++) {
    const [city, , categories] = pickWeighted(CITY_BIASES);
    const diseaseCategory = pick(categories);
    const symptomType     = pick(SYMPTOM_TYPES);
    const severity        = pick(SEVERITIES);
    const source          = pick(SOURCES);

    const temperature = symptomType === 'fever'
      ? String((37.5 + Math.random() * 2.5).toFixed(1))
      : undefined;

    rows.push({
      city,
      symptomType,
      temperature,
      diseaseCategory,
      severity,
      source,
      reportedAt: randomDate(30),
    });
  }

  // Insert in chunks
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(symptomReports).values(rows.slice(i, i + CHUNK));
    process.stdout.write(`  inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }

  console.log(`\nDone — seeded ${total} records.`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
