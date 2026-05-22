import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const authLogs = pgTable('auth_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  email: varchar('email', { length: 200 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const blockedIps = pgTable('blocked_ips', {
  id: serial('id').primaryKey(),
  ip: varchar('ip', { length: 45 }).unique().notNull(),
  reason: varchar('reason', { length: 200 }),
  blockedAt: timestamp('blocked_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});
