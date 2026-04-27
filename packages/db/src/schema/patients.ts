import { pgTable, uuid, text, timestamp, decimal, boolean, date, pgEnum } from 'drizzle-orm/pg-core';

export const patientStatusEnum = pgEnum('patient_status', ['pending_verification', 'active', 'suspended', 'premium']);
export const bloodGroupEnum = pgEnum('blood_group', ['O_minus', 'O_plus', 'A_minus', 'A_plus', 'B_minus', 'B_plus', 'AB_minus', 'AB_plus', 'unknown']);

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),

  phone: text('phone').unique().notNull(),
  email: text('email'),
  fullName: text('full_name').notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: text('gender'),

  passportNumber: text('passport_number'),
  pinfl: text('pinfl'),

  status: patientStatusEnum('status').notNull().default('pending_verification'),

  bloodGroup: bloodGroupEnum('blood_group').default('unknown'),
  allergies: text('allergies').array(),
  chronicConditions: text('chronic_conditions').array(),
  currentMedications: text('current_medications').array(),

  guardianPatientId: uuid('guardian_patient_id'),
  isMinor: boolean('is_minor').notNull().default(false),

  depositBalance: decimal('deposit_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  depositCurrency: text('deposit_currency').notNull().default('UZS'),

  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),

  preferredLanguage: text('preferred_language').notNull().default('uz'),
  anamnesisVitaeCompleted: boolean('anamnesis_vitae_completed').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
