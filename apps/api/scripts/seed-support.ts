/**
 * Seeds the AV Chat support account.
 *
 * The account is found by nickname, never by a hard-coded id: SUPPORT_USER_NICKNAME
 * is what both the API and the web app read, so the row can be reseeded or moved
 * between environments without touching code.
 *
 * Idempotent — running it again updates the existing row rather than creating a
 * second support account.
 *
 * Run from apps/api:  tsx --env-file .env scripts/seed-support.ts
 */
import { db, aivitaUsers } from '@medsoft/db';
import { eq } from 'drizzle-orm';

const NICKNAME = (process.env.SUPPORT_USER_NICKNAME ?? 'aivita').toLowerCase();
const EMAIL = process.env.SUPPORT_USER_EMAIL ?? 'support@local.dev';
const NAME = 'Поддержка AIVITA';
// Served by the web app, so a relative path works in every environment.
const AVATAR = '/brand/aivita-avatar-transparent.png';

async function main() {
  const now = new Date();

  const [existing] = await db
    .select({ id: aivitaUsers.id })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.nickname, NICKNAME))
    .limit(1);

  if (existing) {
    await db
      .update(aivitaUsers)
      .set({ name: NAME, avatarUrl: AVATAR, emailVerified: now, updatedAt: now })
      .where(eq(aivitaUsers.id, existing.id));
    console.log(`support account updated: @${NICKNAME} (${existing.id})`);
  } else {
    const [created] = await db
      .insert(aivitaUsers)
      .values({
        nickname: NICKNAME,
        email: EMAIL,
        name: NAME,
        avatarUrl: AVATAR,
        // 'mock' is the provider the app already uses for accounts that never
        // sign in interactively; support is written to, not logged into.
        provider: 'mock',
        role: 'admin',
        emailVerified: now,
        onboardingCompleted: true,
      })
      .returning({ id: aivitaUsers.id });
    console.log(`support account created: @${NICKNAME} (${created.id})`);
  }

  const [row] = await db
    .select({
      id: aivitaUsers.id,
      nickname: aivitaUsers.nickname,
      name: aivitaUsers.name,
      avatarUrl: aivitaUsers.avatarUrl,
      emailVerified: aivitaUsers.emailVerified,
    })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.nickname, NICKNAME))
    .limit(1);

  console.log(JSON.stringify(row, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
