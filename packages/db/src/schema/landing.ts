import { pgTable, uuid, text, varchar, boolean, timestamp, unique, jsonb, serial } from 'drizzle-orm/pg-core';
import { adminUsers } from './admins';

export const landingWaitlist = pgTable('landing_waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  locale: varchar('locale', { length: 5 }).default('ru'),
  source: varchar('source', { length: 50 }).default('landing'),
  userAgent: text('user_agent'),
  ip: varchar('ip', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueEmail: unique('landing_waitlist_email_unique').on(t.email),
}));

export const landingConfig = pgTable('landing_config', {
  key: varchar('key', { length: 50 }).primaryKey(),
  payload: jsonb('payload').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clinicDemoRequests = pgTable('clinic_demo_requests', {
  id: serial('id').primaryKey(),
  clinicName: varchar('clinic_name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }),
  doctorsCount: varchar('doctors_count', { length: 20 }).notNull(),
  comment: text('comment'),
  locale: varchar('locale', { length: 5 }).default('ru'),
  status: varchar('status', { length: 20 }).default('new').notNull(),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const downloadLogs = pgTable('download_logs', {
  id: serial('id').primaryKey(),
  app: varchar('app', { length: 20 }).notNull(),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
