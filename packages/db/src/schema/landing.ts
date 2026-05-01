import { pgTable, uuid, text, varchar, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { adminUsers } from './admins';

export const landingContent = pgTable('landing_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  section: varchar('section', { length: 50 }).notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  locale: varchar('locale', { length: 5 }).notNull(),
  value: text('value').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  updatedBy: uuid('updated_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueConstraint: unique('landing_content_unique').on(t.section, t.key, t.locale),
}));
