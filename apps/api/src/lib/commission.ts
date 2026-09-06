import { db } from '@medsoft/db';
import { platformSettings } from '@medsoft/db';
import { eq } from 'drizzle-orm';

// Default mirrors the value this used to be hardcoded to (payouts.ts,
// doctor/earnings.ts) — changing it here only takes effect for consultations
// priced/paid after the change; already-created `payments` rows keep the
// commission they were computed with at the time.
const DEFAULT_CONSULTATION_COMMISSION_PERCENT = 20;

export async function getConsultationCommissionPercent(): Promise<number> {
  const [row] = await db.select().from(platformSettings)
    .where(eq(platformSettings.key, 'commission_consultation'))
    .limit(1);
  const parsed = row?.value ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_CONSULTATION_COMMISSION_PERCENT;
}
