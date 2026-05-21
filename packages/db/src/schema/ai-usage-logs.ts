import { pgTable, serial, integer, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';

export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  module: varchar('module', { length: 30 }).notNull(),
  model: varchar('model', { length: 50 }).notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  costUsd: numeric('cost_usd', { precision: 8, scale: 6 }),
  responseTimeMs: integer('response_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
