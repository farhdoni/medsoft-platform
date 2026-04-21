import { boolean, decimal, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { doctors } from './doctors';
import { clinics } from './clinics';

export const appointmentTypeEnum = pgEnum('appointment_type', ['telemedicine_video', 'telemedicine_chat', 'offline_clinic', 'home_visit']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled_by_patient', 'cancelled_by_doctor', 'no_show']);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),

  patientId: uuid('patient_id').notNull().references(() => patients.id),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id),
  clinicId: uuid('clinic_id').references(() => clinics.id),

  type: appointmentTypeEnum('type').notNull(),
  status: appointmentStatusEnum('status').notNull().default('scheduled'),

  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),

  priceUzs: decimal('price_uzs', { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean('is_paid').notNull().default(false),
  transactionId: uuid('transaction_id'),

  patientComplaint: text('patient_complaint'),
  doctorNotes: text('doctor_notes'),
  diagnosis: text('diagnosis'),
  prescription: text('prescription'),

  videoRoomUrl: text('video_room_url'),
  videoStartedAt: timestamp('video_started_at', { withTimezone: true }),
  videoEndedAt: timestamp('video_ended_at', { withTimezone: true }),

  aiLogId: uuid('ai_log_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
