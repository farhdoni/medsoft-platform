import { pgTable, uuid, text, timestamp, decimal, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { adminUsers } from './admins';

export const sosStatusEnum = pgEnum('sos_status', ['triggered', 'operator_assigned', 'brigade_dispatched', 'in_progress', 'resolved', 'false_alarm', 'cancelled']);

export const sosCalls = pgTable('sos_calls', {
  id: uuid('id').primaryKey().defaultRandom(),

  patientId: uuid('patient_id').notNull().references(() => patients.id),

  status: sosStatusEnum('status').notNull().default('triggered'),

  locationLat: decimal('location_lat', { precision: 10, scale: 7 }).notNull(),
  locationLng: decimal('location_lng', { precision: 10, scale: 7 }).notNull(),
  locationAccuracyMeters: integer('location_accuracy_meters'),
  addressResolved: text('address_resolved'),

  ehrSnapshot: jsonb('ehr_snapshot').notNull(),

  assignedAdminId: uuid('assigned_admin_id').references(() => adminUsers.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),

  brigadeDispatchedAt: timestamp('brigade_dispatched_at', { withTimezone: true }),
  brigadeArrivedAt: timestamp('brigade_arrived_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),

  patientNotes: text('patient_notes'),
  operatorNotes: text('operator_notes'),
  resolutionSummary: text('resolution_summary'),

  triggeredFrom: text('triggered_from').notNull().default('mobile_app'),
  deviceInfo: jsonb('device_info'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
