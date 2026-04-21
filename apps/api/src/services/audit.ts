import { db } from '@medsoft/db';
import { auditLogs } from '@medsoft/db';

export async function logAudit(
  actorAdminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  meta?: { ip?: string; userAgent?: string },
) {
  await db.insert(auditLogs).values({
    actorAdminId,
    action,
    entityType,
    entityId,
    changes: before || after ? { before, after } : undefined,
    actorIp: meta?.ip as never,
    actorUserAgent: meta?.userAgent,
  }).catch(() => { /* non-critical */ });
}
