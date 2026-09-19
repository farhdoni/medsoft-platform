/**
 * One-off tool for the 15 accounts stuck unverified before the
 * orphaned-registration bug was fixed (commit 6b7ee5a, deployed
 * 2026-09-19). Operates ONLY on the explicit, hand-audited id list below —
 * this task's own B1 read-only pass, not a live query — so it can never
 * pick up a different account that happens to match "unverified" later,
 * and never needs to be re-run against a moving target.
 *
 * Two independent actions, chosen per this task's own B2 report:
 *   --mode=delete  frees the email/nickname so the person can register
 *                  fresh themselves. No notification sent.
 *   --mode=resend  sends a brand-new verification code to the account's
 *                  existing email/Telegram (same channel-dispatch path
 *                  apps/api's own /register and /resend-code use), so the
 *                  person can finish the signup they already started
 *                  without re-entering anything. Row stays exactly as is
 *                  until THEY enter the code — this script only re-sends,
 *                  it never marks anyone verified. Only ever applies to
 *                  `real_person`-category rows (see below) even if a wider
 *                  --category is passed — there is no reason to email a
 *                  known internal test account.
 *
 * Usage (dry run is the default — nothing is written without --execute):
 *   pnpm tsx scripts/cleanup-orphaned-accounts.ts --mode=delete --category=test_pattern,test_exchange
 *   pnpm tsx scripts/cleanup-orphaned-accounts.ts --mode=delete --category=test_pattern,test_exchange --execute
 *   pnpm tsx scripts/cleanup-orphaned-accounts.ts --mode=resend --category=real_person
 *   pnpm tsx scripts/cleanup-orphaned-accounts.ts --mode=resend --category=real_person --execute
 *
 * --category is required (comma-separated, no "process everything by
 * default" footgun): test_pattern | test_exchange | real_person.
 *
 * Needs the same env as apps/api: DATABASE_URL at minimum; EMAIL_PROVIDER/
 * RESEND_API_KEY for --mode=resend to actually send anything (EMAIL_PROVIDER
 * =mock just logs it, same as the app in dev); SESSION_SECRET + JWT keys
 * are required only because apps/api/src/env.ts validates them at import
 * time — this script never uses them itself.
 *
 * Delete mode's dry run discovers every table with a foreign key to
 * aivita_users via information_schema (not a hardcoded guess of "which
 * tables might have data") and prints the real per-table row counts for
 * each target id before anything is touched — this is what "no cascade
 * surprises" means here: you see the actual blast radius, not an assumed
 * one, before --execute is ever passed.
 */
import { db } from '../packages/db/src/index.js';
import { sql } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { sendVerificationCode } from '../apps/api/src/lib/email.js';
import { sendAuthMessage } from '../apps/api/src/lib/notify-code.js';
import { resolveBotLocale, verificationCodeMessage } from '../apps/api/src/lib/telegram-i18n.js';

// ─── Audited account list (2026-09-19 B1 pass) ─────────────────────────────

type Category = 'test_pattern' | 'test_exchange' | 'real_person';

interface AuditedAccount {
  id: string;
  category: Category;
  /** Masked, for human review in this script's own output only. */
  note: string;
}

const AUDITED_ACCOUNTS: AuditedAccount[] = [
  // Internal test accounts — name/nickname literally say "test"/"тест".
  { id: '4c2f06bd-29f1-4cc7-b35d-150608349871', category: 'test_pattern', note: 'test***@aivita.uz "Тест Доктор" (doctor)' },
  { id: '01a176b3-e5ed-4884-8992-633c960ef3ce', category: 'test_pattern', note: 'test***@gmail.com "Доктор Тест" (doctor)' },
  { id: 'd2d047f4-ec00-4c2d-8c48-c95b390bcc60', category: 'test_pattern', note: 'test***@gmail.com "Test User"' },

  // Ecosystem-exchange integration test fixtures — provider='test-exchange',
  // no email/nickname/name at all. Not casualties of the registration bug;
  // never went through /register in the first place.
  { id: '73832d1d-ba92-4310-a10d-d18e0f140066', category: 'test_exchange', note: 'no email, provider=test-exchange' },
  { id: '2f780e1f-c85f-4288-9592-865e031a7ba6', category: 'test_exchange', note: 'no email, provider=test-exchange' },

  // Real people, by name/domain — genuinely hit the orphaned-registration bug.
  { id: 'f1752e75-82a6-4b66-aea8-9d78ae321658', category: 'real_person', note: 'akzh***@mail.ru, doctor, "Есенгалиева Акжаркын Утемисовна"' },
  { id: '9ef2d095-9ef7-4001-9dad-393be4e8c134', category: 'real_person', note: 'feru***@gmail.com, "Феруза"' },
  { id: 'ba3d2089-87e9-454f-a9f0-7ff4d4925088', category: 'real_person', note: 'davr***@mail.ru, "Davron"' },
  { id: '0d698363-4dff-4ac0-8eb2-f40ccc4fa125', category: 'real_person', note: 'suhr***@gmail.com, "Suhrobjon" (4 prior attempts)' },
  { id: '14d42e2c-2a64-48ab-a57e-03bfc687412f', category: 'real_person', note: 'oums***@gmail.com, "Уктам Kaримов"' },
  { id: '1d6b3537-4b9c-4fc2-b674-54077c41be07', category: 'real_person', note: 'rsar***@mail.ru, doctor, "Реимова Сарбиназ Есбергеновна"' },
  { id: 'c9a143a0-af76-4ebc-a2ab-6a063bcdb6c7', category: 'real_person', note: 'azim***@gmail.com, "aki" (2 prior attempts)' },
  { id: '620ae6af-849c-4bc2-abe8-3d2d9f80449c', category: 'real_person', note: 'sama***@gmail.com, "samandar" (2 prior attempts)' },
  { id: 'ec1e24a0-ef9c-41a9-a5ce-c24028b8b0dc', category: 'real_person', note: 'aiaz***@gmail.com, "Aziz"' },
  { id: '4bb4a8ae-222d-4677-ab5c-091498c6c8a9', category: 'real_person', note: 'vekt***@mail.ru, "Трифонова Ольга Вадимовна"' },
];

// Redundant, deliberate: this script must never be able to touch the
// operator's own real account, no matter what the id list above says.
const NEVER_TOUCH_EMAIL = 'farhodni@gmail.com';

// ─── CLI args ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1];
  const mode = get('mode');
  if (mode !== 'delete' && mode !== 'resend') {
    throw new Error('--mode=delete|resend is required');
  }
  const categoryArg = get('category');
  if (!categoryArg) {
    throw new Error('--category=test_pattern,test_exchange,real_person is required (comma-separated, at least one)');
  }
  const categories = categoryArg.split(',').map((c) => c.trim()) as Category[];
  for (const c of categories) {
    if (!['test_pattern', 'test_exchange', 'real_person'].includes(c)) {
      throw new Error(`Unknown category "${c}"`);
    }
  }
  const execute = args.includes('--execute');
  return { mode: mode as 'delete' | 'resend', categories, execute };
}

// ─── Delete mode ─────────────────────────────────────────────────────────

async function findReferencingTables(): Promise<Array<{ table: string; column: string }>> {
  const rows = await db.execute(sql`
    SELECT DISTINCT tc.table_name AS table, kcu.column_name AS column
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'aivita_users'
      AND tc.table_name != 'aivita_users'
  `);
  return rows as unknown as Array<{ table: string; column: string }>;
}

async function reportCascade(id: string, refs: Array<{ table: string; column: string }>): Promise<number> {
  let total = 0;
  for (const { table, column } of refs) {
    const result = await db.execute(
      sql`SELECT count(*)::int AS n FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${id}`,
    );
    const n = (result as unknown as Array<{ n: number }>)[0]?.n ?? 0;
    if (n > 0) {
      console.log(`    ${table}.${column}: ${n} row(s)`);
      total += n;
    }
  }
  return total;
}

async function runDelete(accounts: AuditedAccount[], execute: boolean) {
  const refs = await findReferencingTables();
  console.log(`Found ${refs.length} tables with a FK to aivita_users.\n`);

  let deleted = 0;
  for (const acc of accounts) {
    const [row] = await db.execute(
      sql`SELECT email, email_verified FROM aivita_users WHERE id = ${acc.id}`,
    ) as unknown as Array<{ email: string | null; email_verified: Date | null }>;

    if (!row) {
      console.log(`SKIP ${acc.id} (${acc.note}) — no longer exists, already handled.`);
      continue;
    }
    if (row.email === NEVER_TOUCH_EMAIL) {
      throw new Error(`Refusing to touch ${acc.id} — matches NEVER_TOUCH_EMAIL. Aborting entire run.`);
    }
    if (row.email_verified) {
      console.log(`SKIP ${acc.id} (${acc.note}) — got verified since the audit, no longer orphaned.`);
      continue;
    }

    console.log(`${execute ? 'DELETING' : '[DRY RUN] would delete'} ${acc.id} (${acc.note}):`);
    const cascaded = await reportCascade(acc.id, refs);
    if (cascaded === 0) console.log('    (no related rows in any referencing table)');

    if (execute) {
      await db.execute(sql`DELETE FROM aivita_users WHERE id = ${acc.id}`);
      deleted++;
    }
    console.log('');
  }

  console.log(execute ? `Deleted ${deleted} account(s).` : `Dry run complete — ${accounts.length} account(s) would be processed. Re-run with --execute to actually delete.`);
}

// ─── Resend mode ─────────────────────────────────────────────────────────

async function runResend(accounts: AuditedAccount[], execute: boolean) {
  const realOnly = accounts.filter((a) => a.category === 'real_person');
  const skipped = accounts.length - realOnly.length;
  if (skipped > 0) {
    console.log(`Skipping ${skipped} non-real_person account(s) — --mode=resend only ever emails real_person rows.\n`);
  }

  let sent = 0;
  for (const acc of realOnly) {
    const [row] = await db.execute(
      sql`SELECT id, email, locale, email_verified FROM aivita_users WHERE id = ${acc.id}`,
    ) as unknown as Array<{ id: string; email: string | null; locale: string; email_verified: Date | null }>;

    if (!row) {
      console.log(`SKIP ${acc.id} (${acc.note}) — no longer exists.`);
      continue;
    }
    if (row.email === NEVER_TOUCH_EMAIL) {
      throw new Error(`Refusing to touch ${acc.id} — matches NEVER_TOUCH_EMAIL. Aborting entire run.`);
    }
    if (row.email_verified) {
      console.log(`SKIP ${acc.id} (${acc.note}) — already verified since the audit.`);
      continue;
    }
    if (!row.email) {
      console.log(`SKIP ${acc.id} (${acc.note}) — no email on file, nothing to send to.`);
      continue;
    }

    if (!execute) {
      console.log(`[DRY RUN] would send a fresh code to ${acc.note}`);
      continue;
    }

    const code = String(randomInt(100000, 999999));
    await db.execute(sql`
      INSERT INTO aivita_email_verifications (user_id, code, expires_at)
      VALUES (${row.id}, ${code}, now() + interval '15 minutes')
    `);
    try {
      await sendAuthMessage(
        row.id,
        verificationCodeMessage(resolveBotLocale(undefined, row.locale), code),
        () => sendVerificationCode(row.email!, code),
      );
      console.log(`SENT to ${acc.note}`);
      sent++;
    } catch (err) {
      console.error(`FAILED to send to ${acc.note}:`, err);
    }
  }

  console.log(execute ? `\nSent ${sent} code(s).` : `\nDry run complete — ${realOnly.length} account(s) would be emailed. Re-run with --execute to actually send.`);
}

// ─── Entry point ─────────────────────────────────────────────────────────

async function main() {
  const { mode, categories, execute } = parseArgs();
  const accounts = AUDITED_ACCOUNTS.filter((a) => categories.includes(a.category));
  if (accounts.length === 0) {
    console.log('No accounts match the given --category filter. Nothing to do.');
    return;
  }

  console.log(`mode=${mode} categories=${categories.join(',')} execute=${execute}`);
  console.log(`${accounts.length} account(s) selected.\n`);

  if (mode === 'delete') {
    await runDelete(accounts, execute);
  } else {
    await runResend(accounts, execute);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
