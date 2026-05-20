import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const drugInteractions = pgTable(
  'drug_interactions',
  {
    id: serial('id').primaryKey(),
    drug1: varchar('drug1', { length: 200 }).notNull(),
    drug2: varchar('drug2', { length: 200 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    // critical | major | moderate | minor | none
    description: text('description'),
    recommendation: text('recommendation'),
    source: varchar('source', { length: 100 }).default('AIVITA AI'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    pairIdx: index('drug_interactions_pair_idx').on(table.drug1, table.drug2),
  }),
);
