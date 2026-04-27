import { pgTable, uuid, text, timestamp, decimal, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const clinicTypeEnum = pgEnum('clinic_type', ['hospital', 'clinic', 'laboratory', 'pharmacy', 'diagnostic_center']);
export const clinicStatusEnum = pgEnum('clinic_status', ['pending', 'active', 'suspended']);

export const clinics = pgTable('clinics', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: text('name').notNull(),
  type: clinicTypeEnum('type').notNull().default('clinic'),
  status: clinicStatusEnum('status').notNull().default('pending'),

  address: text('address').notNull(),
  city: text('city').notNull(),
  district: text('district'),
  locationLat: decimal('location_lat', { precision: 10, scale: 7 }),
  locationLng: decimal('location_lng', { precision: 10, scale: 7 }),

  phone: text('phone').notNull(),
  email: text('email'),
  website: text('website'),

  contractNumber: text('contract_number'),
  contractSignedAt: timestamp('contract_signed_at', { withTimezone: true }),
  commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }).notNull().default('0'),

  doctorsCount: integer('doctors_count').notNull().default(0),
  appointmentsThisMonth: integer('appointments_this_month').notNull().default(0),
  revenueThisMonthUzs: decimal('revenue_this_month_uzs', { precision: 14, scale: 2 }).notNull().default('0'),

  logoUrl: text('logo_url'),
  description: text('description'),
  workingHours: jsonb('working_hours'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
