CREATE TABLE IF NOT EXISTS "admin_roles" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(50) UNIQUE NOT NULL,
  "display_name" VARCHAR(100) NOT NULL,
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_user_roles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
  "role_id" INTEGER NOT NULL REFERENCES "admin_roles"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
INSERT INTO "admin_roles" ("name", "display_name", "permissions") VALUES
  ('superadmin', 'Супер-администратор', '{"dashboard":true,"users_read":true,"users_edit":true,"users_delete":true,"doctors_verify":true,"finance_read":true,"finance_edit":true,"payouts":true,"marketing":true,"settings":true,"roles":true,"ai_settings":true,"system":true}'),
  ('admin', 'Администратор', '{"dashboard":true,"users_read":true,"users_edit":true,"users_delete":true,"doctors_verify":true,"finance_read":true,"finance_edit":true,"payouts":true,"marketing":true,"settings":true,"roles":false,"ai_settings":true,"system":true}'),
  ('moderator', 'Модератор', '{"dashboard":true,"users_read":true,"users_edit":true,"users_delete":false,"doctors_verify":true,"finance_read":true,"finance_edit":false,"payouts":false,"marketing":false,"settings":false,"roles":false,"ai_settings":false,"system":false}'),
  ('support', 'Поддержка', '{"dashboard":true,"users_read":true,"users_edit":false,"users_delete":false,"doctors_verify":false,"finance_read":false,"finance_edit":false,"payouts":false,"marketing":false,"settings":false,"roles":false,"ai_settings":false,"system":false}'),
  ('marketing', 'Маркетинг', '{"dashboard":true,"users_read":true,"users_edit":false,"users_delete":false,"doctors_verify":false,"finance_read":true,"finance_edit":false,"payouts":false,"marketing":true,"settings":false,"roles":false,"ai_settings":false,"system":false}'),
  ('finance', 'Финансы', '{"dashboard":true,"users_read":false,"users_edit":false,"users_delete":false,"doctors_verify":false,"finance_read":true,"finance_edit":true,"payouts":true,"marketing":false,"settings":false,"roles":false,"ai_settings":false,"system":false}')
ON CONFLICT ("name") DO NOTHING;
