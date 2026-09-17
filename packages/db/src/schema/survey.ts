import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita.js';

// ─── survey_prompts ─────────────────────────────────────────────────────────────
//
// Append-only event log for the Layer 1 survey engine (Слой 1: движок опроса).
// One row per "a question was shown/skipped/answered" event — NOT one row per
// field. This is deliberate: whether a field is actually filled in is read
// from its own table (health_profiles / allergies / chronic_conditions /
// medications), not tracked redundantly here. This table exists only for the
// two things nothing else records: how many DIFFERENT fields were shown
// today across BOTH channels (the shared ≤3/day cap), and when a field was
// last skipped (the 7-day cooldown before re-asking it). Same shape as the
// existing per-day counting pattern in aivitaMedicationsRouter/ai-chat's
// daily-usage (count rows where created_at >= start of today).
export const surveyPrompts = pgTable(
  'survey_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),

    // Column name/profile field this event is about — e.g. 'allergies',
    // 'medications', 'chronicDiseases', 'heightCm', 'weightKg', 'bloodType',
    // 'smokingStatus', 'alcohol', 'activity'. Kept as free varchar (not a
    // pgEnum) so Step 2 (chat channel) can add new field keys without a
    // migration — validated in application code (SURVEY_FIELDS), not the DB.
    field: varchar('field', { length: 50 }).notNull(),

    channel: varchar('channel', { length: 10 }).notNull(), // 'banner' | 'chat'
    status: varchar('status', { length: 20 }).notNull(),   // 'shown' | 'skipped' | 'answered'

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('survey_prompts_user_created_idx').on(table.userId, table.createdAt),
    userFieldIdx: index('survey_prompts_user_field_idx').on(table.userId, table.field),
  })
);
