import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { adminUsers } from './admins';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  actorAdminId: uuid('actor_admin_id').notNull().references(() => adminUsers.id),
  actorIp: text('actor_ip'),
  actorUserAgent: text('actor_user_agent'),

  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),

  changes: jsonb('changes'),
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
