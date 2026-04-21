import { decimal, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { doctors } from './doctors';

export const aiIntentEnum = pgEnum('ai_intent', ['symptom_check', 'doctor_recommendation', 'medication_info', 'lifestyle_advice', 'other']);
export const aiOutcomeEnum = pgEnum('ai_outcome', ['appointment_booked', 'self_care_advised', 'sos_triggered', 'no_action', 'abandoned']);

export const aiLogs = pgTable('ai_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  patientId: uuid('patient_id').references(() => patients.id),
  sessionId: uuid('session_id').notNull(),

  intent: aiIntentEnum('intent'),
  outcome: aiOutcomeEnum('outcome'),

  role: text('role').notNull(),
  content: text('content').notNull(),
  contentTokens: integer('content_tokens'),

  recommendedDoctorId: uuid('recommended_doctor_id').references(() => doctors.id),
  recommendedSpecialization: text('recommended_specialization'),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),

  modelName: text('model_name'),
  modelLatencyMs: integer('model_latency_ms'),

  resultingAppointmentId: uuid('resulting_appointment_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
