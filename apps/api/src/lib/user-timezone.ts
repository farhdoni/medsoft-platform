import { eq } from 'drizzle-orm';
import { db, aivitaUsers } from '@medsoft/db';
import { safeTimezone } from './timezone.js';

/**
 * Resolve an aivita user's IANA timezone (e.g. "Asia/Tashkent"), falling back to
 * the default for missing/invalid values. The session JWT does not carry the
 * timezone, so date-boundary endpoints look it up here.
 */
export async function getUserTimezone(userId: string): Promise<string> {
  const user = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.id, userId),
    columns: { timezone: true },
  });
  return safeTimezone(user?.timezone);
}
