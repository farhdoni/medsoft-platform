import { db } from '@medsoft/db';
import { auditLogs } from '@medsoft/db';

// Shared by all four files split out of aivita-admin.ts (docs/routes-split-plan.md)
// — auditLog was a single private helper used by the users/doctors/billing/
// home-settings groups alike; extracted here instead of duplicated four times.

export async function auditLog(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
  req?: { header: (k: string) => string | undefined },
) {
  await db.insert(auditLogs).values({
    actorAdminId: adminId,
    action,
    entityType: targetType,
    entityId: targetId ?? undefined,
    metadata: metadata ?? null,
    actorIp: req?.header('x-forwarded-for') ?? req?.header('x-real-ip') ?? null,
    actorUserAgent: req?.header('user-agent') ?? null,
  }).catch(() => {}); // non-fatal
}
