/**
 * Seed landing_content table from existing i18n JSON files.
 * Run with: pnpm tsx scripts/seed-landing.ts
 * Idempotent: uses ON CONFLICT DO UPDATE.
 */
import { db, landingContent } from '../packages/db/src/index.js';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const locales = ['ru', 'uz', 'en'] as const;

async function seed() {
  let inserted = 0;

  for (const locale of locales) {
    const messages = require(join(__dirname, `../apps/aivita/messages/${locale}.json`));

    for (const [section, content] of Object.entries(messages)) {
      if (typeof content !== 'object' || content === null) continue;

      for (const [key, value] of Object.entries(content as Record<string, unknown>)) {
        if (typeof value !== 'string') continue;

        await db
          .insert(landingContent)
          .values({ section, key, locale, value })
          .onConflictDoUpdate({
            target: [landingContent.section, landingContent.key, landingContent.locale],
            set: { value, updatedAt: new Date() },
          });

        inserted++;
      }
    }
  }

  console.log(`✅ Seeded ${inserted} landing content entries (${locales.join(', ')})`);
  process.exit(0);
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); });
