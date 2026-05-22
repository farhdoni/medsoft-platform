import { pgTable, serial, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const faqItems = pgTable('faq_items', {
  id: serial('id').primaryKey(),
  question: varchar('question', { length: 300 }).notNull(),
  answer: text('answer').notNull(),
  category: varchar('category', { length: 50 }).default('general').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
