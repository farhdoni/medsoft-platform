import {
  pgTable,
  uuid,
  text,
  smallint,
  timestamp,
  pgEnum,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';
import { adminUsers } from './admins';
import { conversations } from './messaging';

/**
 * Кабинет поддержки. Таблицы заводит миграция 0037, добивает 0040 — здесь
 * только их типизованное отражение для API.
 *
 * Тикет — надстройка над диалогом, а не его копия: переписка оператора с
 * пользователем остаётся обычным диалогом в conversations/messages и видна
 * пользователю в мессенджере. Отсюда 1:1 и unique на conversationId.
 */

export const supportTicketStatusEnum = pgEnum('support_ticket_status', [
  'open',
  'closed',
]);

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .unique()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    status: supportTicketStatusEnum('status').notNull().default('open'),
    // SET NULL: уволенный оператор не уносит тикет с собой — тот возвращается
    // в нераспределённые.
    assignedOperatorId: uuid('assigned_operator_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    // Ставится один раз и НЕ сбрасывается при переоткрытии: это метка SLA на
    // обращение, а не на текущий круг переписки.
    firstResponseAt: timestamp('first_response_at', { withTimezone: true, precision: 3 }),
    closedAt: timestamp('closed_at', { withTimezone: true, precision: 3 }),
    /** CSAT 1..5; NULL — ещё не оценено. */
    rating: smallint('rating'),
    /** Одна отметка на тикет — иначе автоответ вне часов уходил бы на каждое сообщение. */
    autoReplySentAt: timestamp('auto_reply_sent_at', { withTimezone: true, precision: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => ({
    // Все три очереди читаются одним предикатом: «Мои» — open + assigned=me,
    // «Нераспределённые» — open + assigned IS NULL, «Архив» — closed.
    statusOperatorIdx: index('support_tickets_status_operator_idx').on(t.status, t.assignedOperatorId),
  }),
);

/**
 * Внутренние заметки оператора. Отдельная таблица, а НЕ строка в messages с
 * флагом: заметка не должна иметь ни одного способа доехать до пользователя,
 * а messages читает пользовательский мессенджер.
 */
export const supportNotes = pgTable(
  'support_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    operatorId: uuid('operator_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => ({
    ticketCreatedIdx: index('support_notes_ticket_created_idx').on(t.ticketId, t.createdAt),
  }),
);

/** Общие для всех операторов: смысл шаблона в том, что поддержка отвечает одинаково. */
export const supportTemplates = pgTable('support_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 120 }).notNull(),
  body: text('body').notNull(),
  createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
});

/** Действия оператора, попадающие в support_audit.action. */
export const SUPPORT_AUDIT_ACTIONS = [
  'transfer',
  'block',
  'unblock',
  'resolve_report',
  'close',
  'reopen',
  'change_phone',
  'reset_password',
  'change_plan',
] as const;

export type SupportAuditAction = (typeof SUPPORT_AUDIT_ACTIONS)[number];

/**
 * Журнал действий оператора. Все ссылки SET NULL, а не CASCADE: журнал обязан
 * пережить и удалённого пользователя, и удалённый тикет, и уволенного
 * оператора — просто с обнулённой связью.
 */
export const supportAudit = pgTable(
  'support_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operatorId: uuid('operator_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 60 }).$type<SupportAuditAction>().notNull(),
    targetUserId: uuid('target_user_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),
    ticketId: uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'set null' }),
    reason: text('reason'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index('support_audit_created_idx').on(t.createdAt),
  }),
);

/** Порог эскалации SLA: сколько минут обращение может ждать первого ответа. */
export const SLA_ESCALATION_MINUTES = 60;
