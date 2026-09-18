-- Pharmacy feature (packages/db/src/schema/pharmacy.ts) — declared in the
-- Drizzle schema, code fully built and mounted (apps/api/src/index.ts:
-- /v1/admin/pharmacies, /v1/pharmacy, /v1/aivita/pharmacy; apps/admin has
-- live pages under finance/payouts/pharmacies and partners/pharmacies), but
-- NONE of these 6 tables exist anywhere — confirmed read-only against
-- production (2026-09-18): every one of them is absent. Unlike the other
-- migrations in this cleanup, this is NOT a documented no-op — these
-- CREATE TABLE statements will actually run on prod. The feature's routes
-- are live and reachable right now; every request to them currently fails
-- with "relation does not exist" rather than succeeding, since there is no
-- backing table at all.

CREATE TABLE IF NOT EXISTS "pharmacies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"legal_name" varchar(200),
	"inn" varchar(20),
	"phone" varchar(20),
	"email" varchar(100),
	"logo_url" varchar(500),
	"description" text,
	"commission_percent" numeric(4, 2) DEFAULT '10',
	"status" varchar(20) DEFAULT 'active',
	"tier" varchar(20) DEFAULT 'starter',
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"pharmacy_id" integer NOT NULL,
	"name" varchar(200),
	"address" varchar(300) NOT NULL,
	"lat" numeric(10, 7),
	"lon" numeric(10, 7),
	"phone" varchar(20),
	"working_hours" jsonb,
	"delivery_enabled" boolean DEFAULT false,
	"delivery_radius" integer,
	"delivery_price" integer DEFAULT 0,
	"free_delivery_from" integer,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"pharmacy_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'operator',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pharmacy_users_unique" UNIQUE("pharmacy_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"pharmacy_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(300) NOT NULL,
	"inn_name" varchar(300),
	"dosage" varchar(100),
	"form" varchar(50),
	"price" integer NOT NULL,
	"old_price" integer,
	"stock" integer DEFAULT 0,
	"category" varchar(100),
	"image_url" varchar(500),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"pharmacy_id" integer NOT NULL,
	"branch_id" integer,
	"patient_id" uuid NOT NULL,
	"prescription_id" uuid,
	"items" jsonb NOT NULL,
	"total_price" integer NOT NULL,
	"commission_amount" integer NOT NULL,
	"delivery_type" varchar(20),
	"delivery_address" varchar(300),
	"status" varchar(20) DEFAULT 'new',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pharmacy_id" integer NOT NULL,
	"title" varchar(200),
	"discount_type" varchar(10),
	"discount_value" integer,
	"product_id" integer,
	"category" varchar(100),
	"starts_at" timestamp,
	"ends_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "pharmacies" ADD CONSTRAINT "pharmacies_created_by_id_aivita_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."aivita_users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_branches" ADD CONSTRAINT "pharmacy_branches_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_users" ADD CONSTRAINT "pharmacy_users_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_users" ADD CONSTRAINT "pharmacy_users_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_products" ADD CONSTRAINT "pharmacy_products_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_products" ADD CONSTRAINT "pharmacy_products_branch_id_pharmacy_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."pharmacy_branches"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_patient_id_aivita_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."aivita_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_promotions" ADD CONSTRAINT "pharmacy_promotions_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacies_status_idx" ON "pharmacies" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_branches_pharmacy_idx" ON "pharmacy_branches" ("pharmacy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_users_pharmacy_idx" ON "pharmacy_users" ("pharmacy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_users_user_idx" ON "pharmacy_users" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_products_pharmacy_name_idx" ON "pharmacy_products" ("pharmacy_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_products_name_idx" ON "pharmacy_products" ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_orders_pharmacy_idx" ON "pharmacy_orders" ("pharmacy_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_orders_patient_idx" ON "pharmacy_orders" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_promotions_pharmacy_idx" ON "pharmacy_promotions" ("pharmacy_id","is_active");
