import { boolean, decimal, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const doctorStatusEnum = pgEnum('doctor_status', ['pending', 'active', 'suspended', 'offline']);

export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),

  phone: text('phone').unique().notNull(),
  email: text('email').unique().notNull(),
  fullName: text('full_name').notNull(),

  specialization: text('specialization').notNull(),
  secondarySpecializations: text('secondary_specializations').array(),
  licenseNumber: text('license_number').unique().notNull(),
  yearsOfExperience: integer('years_of_experience').notNull().default(0),

  clinicId: uuid('clinic_id').references(() => clinics.id),

  consultationPriceUzs: decimal('consultation_price_uzs', { precision: 10, scale: 2 }).notNull().default('0'),
  acceptsTelemedicine: boolean('accepts_telemedicine').notNull().default(true),
  acceptsOffline: boolean('accepts_offline').notNull().default(true),

  status: doctorStatusEnum('status').notNull().default('pending'),
  isOnline: boolean('is_online').notNull().default(false),
  ratingAvg: decimal('rating_avg', { precision: 3, scale: 2 }).default('0'),
  ratingCount: integer('rating_count').notNull().default(0),
  appointmentsCount: integer('appointments_count').notNull().default(0),

  bio: text('bio'),
  photoUrl: text('photo_url'),
  education: text('education').array(),
  certifications: text('certifications').array(),
  languages: text('languages').array().notNull().default(['uz', 'ru']),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
