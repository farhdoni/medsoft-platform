import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  index,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { aivitaUsers } from './aivita';

// ─── 1. pharmacies ─────────────────────────────────────────────────────────────

export const pharmacies = pgTable(
  'pharmacies',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    legalName: varchar('legal_name', { length: 200 }),
    inn: varchar('inn', { length: 20 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    logoUrl: varchar('logo_url', { length: 500 }),
    description: text('description'),
    commissionPercent: numeric('commission_percent', { precision: 4, scale: 2 }).default('10'),
    status: varchar('status', { length: 20 }).default('active'),
    // starter | business | network
    tier: varchar('tier', { length: 20 }).default('starter'),
    createdById: uuid('created_by_id').references(() => aivitaUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    statusIdx: index('pharmacies_status_idx').on(table.status),
  }),
);

// ─── 2. pharmacy_users ─────────────────────────────────────────────────────────

export const pharmacyUsers = pgTable(
  'pharmacy_users',
  {
    id: serial('id').primaryKey(),
    pharmacyId: integer('pharmacy_id').notNull().references(() => pharmacies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => aivitaUsers.id, { onDelete: 'cascade' }),
    // operator | manager | director
    role: varchar('role', { length: 20 }).default('operator'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    pharmacyUserIdx: index('pharmacy_users_pharmacy_idx').on(table.pharmacyId),
    userIdx: index('pharmacy_users_user_idx').on(table.userId),
    uniquePharmacyUser: unique('pharmacy_users_unique').on(table.pharmacyId, table.userId),
  }),
);

// ─── 3. pharmacy_branches ──────────────────────────────────────────────────────

export const pharmacyBranches = pgTable(
  'pharmacy_branches',
  {
    id: serial('id').primaryKey(),
    pharmacyId: integer('pharmacy_id').notNull().references(() => pharmacies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }),
    address: varchar('address', { length: 300 }).notNull(),
    lat: numeric('lat', { precision: 10, scale: 7 }),
    lon: numeric('lon', { precision: 10, scale: 7 }),
    phone: varchar('phone', { length: 20 }),
    workingHours: jsonb('working_hours'),
    deliveryEnabled: boolean('delivery_enabled').default(false),
    deliveryRadius: integer('delivery_radius'),
    deliveryPrice: integer('delivery_price').default(0),
    freeDeliveryFrom: integer('free_delivery_from'),
    isActive: boolean('is_active').default(true),
  },
  (table) => ({
    pharmacyIdx: index('pharmacy_branches_pharmacy_idx').on(table.pharmacyId),
  }),
);

// ─── 4. pharmacy_products ──────────────────────────────────────────────────────

export const pharmacyProducts = pgTable(
  'pharmacy_products',
  {
    id: serial('id').primaryKey(),
    pharmacyId: integer('pharmacy_id').notNull().references(() => pharmacies.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id').references(() => pharmacyBranches.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 300 }).notNull(),
    innName: varchar('inn_name', { length: 300 }),
    dosage: varchar('dosage', { length: 100 }),
    form: varchar('form', { length: 50 }),
    price: integer('price').notNull(),
    oldPrice: integer('old_price'),
    stock: integer('stock').default(0),
    category: varchar('category', { length: 100 }),
    imageUrl: varchar('image_url', { length: 500 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    pharmacyNameIdx: index('pharmacy_products_pharmacy_name_idx').on(table.pharmacyId, table.name),
    nameSearchIdx: index('pharmacy_products_name_idx').on(table.name),
  }),
);

// ─── 5. pharmacy_orders ────────────────────────────────────────────────────────

export const pharmacyOrders = pgTable(
  'pharmacy_orders',
  {
    id: serial('id').primaryKey(),
    pharmacyId: integer('pharmacy_id').notNull(),
    branchId: integer('branch_id'),
    patientId: uuid('patient_id').notNull().references(() => aivitaUsers.id, { onDelete: 'restrict' }),
    prescriptionId: uuid('prescription_id'),
    // [{productId, name, qty, price}]
    items: jsonb('items').notNull(),
    totalPrice: integer('total_price').notNull(),
    commissionAmount: integer('commission_amount').notNull(),
    // pickup | delivery
    deliveryType: varchar('delivery_type', { length: 20 }),
    deliveryAddress: varchar('delivery_address', { length: 300 }),
    // new | confirmed | assembled | ready | delivered | cancelled
    status: varchar('status', { length: 20 }).default('new'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    pharmacyIdx: index('pharmacy_orders_pharmacy_idx').on(table.pharmacyId, table.status),
    patientIdx: index('pharmacy_orders_patient_idx').on(table.patientId),
  }),
);

// ─── 6. pharmacy_promotions ────────────────────────────────────────────────────

export const pharmacyPromotions = pgTable(
  'pharmacy_promotions',
  {
    id: serial('id').primaryKey(),
    pharmacyId: integer('pharmacy_id').notNull().references(() => pharmacies.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }),
    // percent | fixed
    discountType: varchar('discount_type', { length: 10 }),
    discountValue: integer('discount_value'),
    productId: integer('product_id'),
    category: varchar('category', { length: 100 }),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    isActive: boolean('is_active').default(true),
  },
  (table) => ({
    pharmacyIdx: index('pharmacy_promotions_pharmacy_idx').on(table.pharmacyId, table.isActive),
  }),
);
