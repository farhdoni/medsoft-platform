import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const emailCampaigns = pgTable('email_campaigns', {
  id: serial('id').primaryKey(),
  subject: varchar('subject', { length: 200 }).notNull(),
  body: text('body').notNull(),
  audience: varchar('audience', { length: 30 }).notNull().default('all'),
  recipientCount: integer('recipient_count').default(0).notNull(),
  openCount: integer('open_count').default(0).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 200 }).notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
