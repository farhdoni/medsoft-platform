import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';
import { aivitaPrescriptions } from './aivita-doctor';

// ─── 1. medication_schedule ────────────────────────────────────────────────────

export const medicationSchedule = pgTable(
  'medication_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    prescriptionId: uuid('prescription_id').references(() => aivitaPrescriptions.id, { onDelete: 'set null' }),
    // null = самостоятельно добавленное лекарство пациентом

    // Информация о лекарстве
    title: varchar('title', { length: 200 }).notNull(),
    dosage: varchar('dosage', { length: 100 }),
    frequency: varchar('frequency', { length: 50 }).notNull().default('1 раз в день'),
    times: jsonb('times').$type<string[]>().notNull().default([]),
    // ["08:00", "20:00"] — конкретные часы приёма

    // Длительность курса
    durationDays: integer('duration_days'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),

    // Инструкции
    instructions: text('instructions'),

    // Дополнительная медицинская информация
    sideEffects: jsonb('side_effects').$type<string[]>().notNull().default([]),
    contraindications: jsonb('contraindications').$type<string[]>().notNull().default([]),
    foodInstruction: varchar('food_instruction', { length: 50 }),
    // 'before' | 'after' | 'during' | 'no_alcohol' | null

    // Учёт таблеток
    remainingPills: integer('remaining_pills'),

    // Напоминания
    reminderEnabled: boolean('reminder_enabled').notNull().default(true),
    reminderMinutesBefore: integer('reminder_minutes_before').notNull().default(5),
    persistentReminder: boolean('persistent_reminder').notNull().default(false),
    // true = напоминать каждые 15 мин пока не отметит

    // Статус и источник
    status: varchar('status', { length: 20 }).notNull().default('active'),
    // 'active' | 'paused' | 'completed'
    isActive: boolean('is_active').notNull().default(true),
    createdBy: varchar('created_by', { length: 20 }).notNull().default('patient'),
    // 'patient' | 'doctor'
    source: varchar('source', { length: 20 }).notNull().default('manual'),
    // 'manual' | 'receipt_ocr' | 'doctor' | 'chat'
    doctorId: uuid('doctor_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('med_schedule_user_idx').on(table.userId, table.isActive),
    prescriptionIdx: index('med_schedule_prescription_idx').on(table.prescriptionId),
  }),
);

// ─── 2. medication_log ─────────────────────────────────────────────────────────

export const medicationLog = pgTable(
  'medication_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('schedule_id').notNull().references(() => medicationSchedule.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduled_at').notNull(),
    // Когда должен был принять (конкретная дата+время)
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // pending | taken | skipped | missed
    takenAt: timestamp('taken_at'),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('med_log_user_idx').on(table.userId, table.scheduledAt),
    scheduleIdx: index('med_log_schedule_idx').on(table.scheduleId, table.scheduledAt),
  }),
);
