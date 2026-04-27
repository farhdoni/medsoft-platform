import { pgTable, uuid, text, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { clinics } from './clinics';
import { adminUsers } from './admins';

export const transactionTypeEnum = pgEnum('transaction_type', ['deposit_topup', 'appointment_payment', 'refund', 'withdrawal', 'commission_to_clinic', 'bonus']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed', 'refunded', 'cancelled']);
export const paymentProviderEnum = pgEnum('payment_provider', ['click', 'payme', 'uzcard', 'humo', 'internal_deposit', 'manual']);

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),

  patientId: uuid('patient_id').references(() => patients.id),
  appointmentId: uuid('appointment_id'),
  clinicId: uuid('clinic_id').references(() => clinics.id),

  type: transactionTypeEnum('type').notNull(),
  status: transactionStatusEnum('status').notNull().default('pending'),
  provider: paymentProviderEnum('provider').notNull(),

  amountUzs: decimal('amount_uzs', { precision: 14, scale: 2 }).notNull(),
  direction: text('direction').notNull(),

  providerTransactionId: text('provider_transaction_id'),
  providerResponse: text('provider_response'),

  description: text('description'),
  initiatedByAdminId: uuid('initiated_by_admin_id').references(() => adminUsers.id),

  completedAt: timestamp('completed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
