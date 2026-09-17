import { pgTable, serial, integer, varchar, numeric, timestamp, uuid, index } from 'drizzle-orm/pg-core';

export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  // Separate from userId (integer, unused, no FK — see migration 0060's
  // comment): AIVITA patients are uuid-keyed, so chat usage rows set this
  // instead of userId.
  aivitaUserId: uuid('aivita_user_id'),
  module: varchar('module', { length: 30 }).notNull(),
  model: varchar('model', { length: 50 }).notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  cacheCreationInputTokens: integer('cache_creation_input_tokens').default(0).notNull(),
  cacheReadInputTokens: integer('cache_read_input_tokens').default(0).notNull(),
  costUsd: numeric('cost_usd', { precision: 8, scale: 6 }),
  responseTimeMs: integer('response_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  aivitaUserIdx: index('ai_usage_logs_aivita_user_idx').on(table.aivitaUserId),
}));
