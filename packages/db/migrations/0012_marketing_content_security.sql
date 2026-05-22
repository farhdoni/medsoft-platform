CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" SERIAL PRIMARY KEY,
  "subject" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "audience" VARCHAR(30) NOT NULL DEFAULT 'all',
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "open_count" INTEGER NOT NULL DEFAULT 0,
  "scheduled_at" TIMESTAMPTZ,
  "sent_at" TIMESTAMPTZ,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "created_by_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
INSERT INTO "email_templates" ("name", "subject", "body") VALUES
  ('Приветствие', 'Добро пожаловать в Aivita!', '<h1>Привет!</h1><p>Рады видеть вас в Aivita — вашем личном AI-помощнике здоровья.</p>'),
  ('Новая функция', 'Мы обновились: новые возможности Aivita', '<h1>Новое в Aivita</h1><p>Мы добавили новые функции, которые сделают ваше здоровье под контролем.</p>'),
  ('Напоминание', 'Не забудьте пройти ежедневный чекап', '<h1>Время чекапа!</h1><p>Сделайте ежедневный осмотр здоровья с AI-ассистентом.</p>'),
  ('Акция', 'Специальное предложение для вас 🎁', '<h1>Только для вас</h1><p>Получите скидку 30% на подписку Plus. Предложение ограничено!</p>'),
  ('Чекап', 'Результаты вашего AI-чекапа готовы', '<h1>Ваш чекап</h1><p>AI-ассистент Aivita проанализировал ваши данные. Посмотрите результаты.</p>')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faq_items" (
  "id" SERIAL PRIMARY KEY,
  "question" VARCHAR(300) NOT NULL,
  "answer" TEXT NOT NULL,
  "category" VARCHAR(50) NOT NULL DEFAULT 'general',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT,
  "email" VARCHAR(200),
  "ip" VARCHAR(45),
  "user_agent" VARCHAR(500),
  "status" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_logs_ip_idx" ON "auth_logs" ("ip");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_logs_created_at_idx" ON "auth_logs" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocked_ips" (
  "id" SERIAL PRIMARY KEY,
  "ip" VARCHAR(45) UNIQUE NOT NULL,
  "reason" VARCHAR(200),
  "blocked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ
);
