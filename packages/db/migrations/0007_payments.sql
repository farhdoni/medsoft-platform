-- subscription_plans
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(50) NOT NULL,
  "price" integer NOT NULL,
  "period" varchar(20) NOT NULL,
  "target_role" varchar(20) NOT NULL,
  "features" jsonb DEFAULT '[]',
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- user_payment_methods
CREATE TABLE IF NOT EXISTS "user_payment_methods" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" varchar(20) NOT NULL,
  "card_token" varchar(200) NOT NULL,
  "card_last_four" varchar(4),
  "card_type" varchar(20),
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "aivita_users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "plan_id" integer NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "payment_method_id" integer,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "auto_renew" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "aivita_users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id");
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "user_payment_methods"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- payments
CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "type" varchar(20) NOT NULL,
  "reference_id" integer,
  "amount" integer NOT NULL,
  "commission" integer DEFAULT 0,
  "net_amount" integer,
  "currency" varchar(3) DEFAULT 'UZS' NOT NULL,
  "provider" varchar(20),
  "provider_transaction_id" varchar(100),
  "payment_method_id" integer,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  CONSTRAINT "payments_provider_transaction_id_unique" UNIQUE("provider_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "aivita_users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "user_payment_methods"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- doctor_payouts
CREATE TABLE IF NOT EXISTS "doctor_payouts" (
  "id" serial PRIMARY KEY NOT NULL,
  "doctor_id" uuid NOT NULL,
  "amount" integer NOT NULL,
  "period" varchar(20),
  "card_number" varchar(20),
  "bank_name" varchar(100),
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "paid_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctor_payouts" ADD CONSTRAINT "doctor_payouts_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "aivita_users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- pharmacy_payouts
CREATE TABLE IF NOT EXISTS "pharmacy_payouts" (
  "id" serial PRIMARY KEY NOT NULL,
  "pharmacy_id" integer NOT NULL,
  "amount" integer NOT NULL,
  "period" varchar(20),
  "bank_account" varchar(30),
  "mfo" varchar(10),
  "inn" varchar(20),
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "paid_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- promo_codes
CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(30) NOT NULL,
  "discount_type" varchar(10) NOT NULL,
  "discount_value" integer NOT NULL,
  "max_uses" integer,
  "used_count" integer DEFAULT 0 NOT NULL,
  "valid_until" timestamp,
  "plan_slugs" jsonb DEFAULT '[]',
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint

-- doctor_payout_settings
CREATE TABLE IF NOT EXISTS "doctor_payout_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "doctor_id" uuid NOT NULL,
  "card_number" varchar(20),
  "bank_name" varchar(100),
  "owner_name" varchar(100),
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "doctor_payout_settings_doctor_id_unique" UNIQUE("doctor_id")
);
--> statement-breakpoint
ALTER TABLE "doctor_payout_settings" ADD CONSTRAINT "doctor_payout_settings_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "aivita_users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- ─── Seed: subscription plans ─────────────────────────────────────────────────
INSERT INTO "subscription_plans" ("name", "slug", "price", "period", "target_role", "features", "is_active") VALUES
  ('Free', 'free', 0, 'monthly', 'patient', '["AI-чат 5 сообщений/день", "Чекап 1 раз/месяц", "Семья: 2 человека", "Базовый дашборд здоровья"]', true),
  ('Premium', 'premium', 49000, 'monthly', 'patient', '["AI-чат безлимит", "Чекап неограниченно", "Семья: до 10 человек", "Детальная аналитика здоровья", "Приоритетная поддержка", "Уведомления о приёмах"]', true),
  ('Premium Family', 'premium_family', 79000, 'monthly', 'patient', '["AI-чат безлимит", "Семья: до 10 человек", "Индивидуальные профили", "AI-рекомендации для каждого", "Приоритетная поддержка"]', true),
  ('Premium Annual', 'premium_annual', 390000, 'annual', 'patient', '["Всё из Premium × 12 месяцев", "Скидка 34%", "AI-чат безлимит", "Семья: до 10 человек"]', true),
  ('Doctor Pro', 'doctor_pro', 99000, 'monthly', 'doctor', '["До 50 пациентов/месяц", "AI-ассистент врача", "Шаблоны приёмов", "Базовая аналитика"]', true),
  ('Doctor Premium', 'doctor_premium', 199000, 'monthly', 'doctor', '["Неограниченно пациентов", "AI-ассистент врача", "Расширенная аналитика", "Приоритетное размещение", "Видеоконсультации"]', true),
  ('Clinic Starter', 'clinic_starter', 299000, 'monthly', 'clinic', '["До 5 врачей", "Базовое расписание", "Запись онлайн", "Отчёты"]', true),
  ('Clinic Business', 'clinic_business', 599000, 'monthly', 'clinic', '["До 20 врачей", "CRM пациентов", "AI-аналитика", "Интеграция МИС", "Приоритетная поддержка"]', true),
  ('Clinic Enterprise', 'clinic_enterprise', 999000, 'monthly', 'clinic', '["Неограниченно врачей", "Полный CRM", "API интеграции", "Персональный менеджер", "SLA 99.9%"]', true),
  ('Pharmacy Business', 'pharmacy_business', 199000, 'monthly', 'pharmacy', '["До 3 филиалов", "Каталог до 1000 товаров", "Доставка", "Базовая аналитика"]', true),
  ('Pharmacy Network', 'pharmacy_network', 399000, 'monthly', 'pharmacy', '["Неограниченно филиалов", "Неограниченный каталог", "API интеграция", "Расширенная аналитика", "Приоритетное размещение"]', true)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- ─── Seed: promo code FIRST30 ─────────────────────────────────────────────────
INSERT INTO "promo_codes" ("code", "discount_type", "discount_value", "max_uses", "valid_until", "plan_slugs", "is_active") VALUES
  ('FIRST30', 'percent', 30, 1000, '2026-12-31 23:59:59', '["premium","premium_family","premium_annual","doctor_pro","doctor_premium"]', true)
ON CONFLICT ("code") DO NOTHING;
