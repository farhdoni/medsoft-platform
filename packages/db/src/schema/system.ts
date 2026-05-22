import { pgTable, serial, varchar, integer, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

// ─── system_backups ────────────────────────────────────────────────────────────

export const systemBackups = pgTable(
  'system_backups',
  {
    id: serial('id').primaryKey(),
    filename: varchar('filename', { length: 200 }).notNull(),
    sizeBytes: integer('size_bytes').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index('system_backups_created_at_idx').on(t.createdAt),
  }),
);

// ─── system_logs ───────────────────────────────────────────────────────────────

export const systemLogs = pgTable(
  'system_logs',
  {
    id: serial('id').primaryKey(),
    level: varchar('level', { length: 10 }).notNull(),    // info | warning | error
    module: varchar('module', { length: 30 }).notNull(),  // api | auth | payment | ai | system
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    levelIdx: index('system_logs_level_idx').on(t.level),
    moduleIdx: index('system_logs_module_idx').on(t.module),
    createdAtIdx: index('system_logs_created_at_idx').on(t.createdAt),
  }),
);
