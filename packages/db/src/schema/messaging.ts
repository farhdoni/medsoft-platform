import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  unique,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';
import { adminUsers } from './admins';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const conversationTypeEnum = pgEnum('conversation_type', [
  'direct',
  'group',
  'channel',
]);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'active',
  'archived',
]);

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'voice',
  'file',
  'image',
  'location',
]);

export const messageReportStatusEnum = pgEnum('message_report_status', [
  'pending',
  'reviewed',
  'dismissed',
]);

// ─── 1. conversations ────────────────────────────────────────────────────────

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: conversationTypeEnum('type').notNull().default('direct'),
  status: conversationStatusEnum('status').notNull().default('active'),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── 2. conversation_participants ───────────────────────────────────────────

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at'),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    convUserUnique: unique('conv_participants_conv_user_unique').on(
      table.conversationId,
      table.userId
    ),
    convIdx: index('conv_participants_conv_idx').on(table.conversationId),
    userIdx: index('conv_participants_user_idx').on(table.userId),
  })
);

// ─── 3. messages ─────────────────────────────────────────────────────────────

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    type: messageTypeEnum('type').notNull().default('text'),
    content: text('content'),
    attachmentUrl: text('attachment_url'),
    attachmentName: text('attachment_name'),
    attachmentMime: text('attachment_mime'),
    attachmentSize: integer('attachment_size'),
    replyToId: uuid('reply_to_id').references((): AnyPgColumn => messages.id, {
      onDelete: 'set null',
    }),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    convCreatedIdx: index('messages_conv_created_idx').on(
      table.conversationId,
      table.createdAt
    ),
    senderIdx: index('messages_sender_idx').on(table.senderId),
  })
);

// ─── 4. user_blocks ──────────────────────────────────────────────────────────

export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueBlock: unique('user_blocks_blocker_blocked_unique').on(
      table.blockerId,
      table.blockedId
    ),
    blockerIdx: index('user_blocks_blocker_idx').on(table.blockerId),
    blockedIdx: index('user_blocks_blocked_idx').on(table.blockedId),
  })
);

// ─── 5. message_reports ──────────────────────────────────────────────────────

export const messageReports = pgTable(
  'message_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    status: messageReportStatusEnum('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    messageIdx: index('message_reports_message_idx').on(table.messageId),
    reporterIdx: index('message_reports_reporter_idx').on(table.reporterId),
    statusIdx: index('message_reports_status_idx').on(table.status),
  })
);

// ─── 6. message_reactions ────────────────────────────────────────────────────

export const messageReactions = pgTable(
  'message_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    messageUserUnique: unique('message_reactions_message_user_unique').on(
      table.messageId,
      table.userId
    ),
    messageIdx: index('message_reactions_message_idx').on(table.messageId),
  })
);
