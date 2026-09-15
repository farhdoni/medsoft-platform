import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';
import { messages, conversations } from './messaging';

// ─── 1. subscription_plans ─────────────────────────────────────────────────────

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  price: integer('price').notNull(),
  period: varchar('period', { length: 20 }).notNull(), // monthly | annual | one_time
  targetRole: varchar('target_role', { length: 20 }).notNull(), // patient | doctor | clinic | pharmacy
  features: jsonb('features').$type<string[]>().default([]),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── 2. user_payment_methods ──────────────────────────────────────────────────

export const userPaymentMethods = pgTable('user_payment_methods', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(), // click | payme | uzum
  cardToken: varchar('card_token', { length: 200 }).notNull(),
  cardLastFour: varchar('card_last_four', { length: 4 }),
  cardType: varchar('card_type', { length: 20 }), // uzcard | humo | visa | mastercard | uzum_wallet
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── 3. subscriptions ─────────────────────────────────────────────────────────

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active | expired | cancelled | past_due
  paymentMethodId: integer('payment_method_id').references(() => userPaymentMethods.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  autoRenew: boolean('auto_renew').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── 4. payments ──────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // subscription | consultation | pharmacy_order | booking
  referenceId: integer('reference_id'),
  amount: integer('amount').notNull(),
  commission: integer('commission').default(0),
  netAmount: integer('net_amount'),
  currency: varchar('currency', { length: 3 }).default('UZS').notNull(),
  provider: varchar('provider', { length: 20 }), // click | payme | uzum
  providerTransactionId: varchar('provider_transaction_id', { length: 100 }).unique(),
  paymentMethodId: integer('payment_method_id').references(() => userPaymentMethods.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | processing | completed | failed | refunded
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// ─── 4b. consultation_invoices ─────────────────────────────────────────────────
//
// A doctor-initiated bill inside an AV Chat conversation (message type
// 'invoice' — see schema/messaging.ts). The message row itself carries no
// amount/status: those live here, keyed by messageId, so the chat schema
// doesn't need payment columns and this table doesn't need message columns.
// `paymentId` stays null until paid — it points at the `payments` row created
// at that moment (type='consultation', userId=doctorId per the payout
// convention below), never the other way around.

export const consultationInvoices = pgTable('consultation_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }).unique(),
  doctorId: uuid('doctor_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | paid | cancelled
  createdAt: timestamp('created_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
  paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'set null' }),
});

// ─── 5. doctor_payouts ─────────────────────────────────────────────────────────

export const doctorPayouts = pgTable('doctor_payouts', {
  id: serial('id').primaryKey(),
  doctorId: uuid('doctor_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  period: varchar('period', { length: 20 }),
  cardNumber: varchar('card_number', { length: 20 }),
  bankName: varchar('bank_name', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | processing | completed
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── 6. pharmacy_payouts ──────────────────────────────────────────────────────

export const pharmacyPayouts = pgTable('pharmacy_payouts', {
  id: serial('id').primaryKey(),
  pharmacyId: integer('pharmacy_id').notNull(),
  amount: integer('amount').notNull(),
  period: varchar('period', { length: 20 }),
  bankAccount: varchar('bank_account', { length: 30 }),
  mfo: varchar('mfo', { length: 10 }),
  inn: varchar('inn', { length: 20 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── 7. promo_codes ───────────────────────────────────────────────────────────

export const promoCodes = pgTable('promo_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 30 }).notNull().unique(),
  discountType: varchar('discount_type', { length: 10 }).notNull(), // percent | fixed
  discountValue: integer('discount_value').notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  validUntil: timestamp('valid_until'),
  planSlugs: jsonb('plan_slugs').$type<string[]>().default([]),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── 8. doctor_payout_settings ────────────────────────────────────────────────

export const doctorPayoutSettings = pgTable('doctor_payout_settings', {
  id: serial('id').primaryKey(),
  doctorId: uuid('doctor_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }).unique(),
  cardNumber: varchar('card_number', { length: 20 }),
  bankName: varchar('bank_name', { length: 100 }),
  ownerName: varchar('owner_name', { length: 100 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── 9. referrals ─────────────────────────────────────────────────────────────

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: uuid('referrer_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
  referredId: uuid('referred_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }).unique(),
  code: varchar('code', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | completed | expired
  rewardGiven: boolean('reward_given').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── 10. platform_settings ────────────────────────────────────────────────────

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
