-- Migration: landing CMS content table

CREATE TABLE IF NOT EXISTS "landing_content" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "section"      varchar(50)  NOT NULL,
  "key"          varchar(100) NOT NULL,
  "locale"       varchar(5)   NOT NULL,
  "value"        text         NOT NULL,
  "is_published" boolean      NOT NULL DEFAULT true,
  "updated_by"   uuid REFERENCES "admin_users"("id"),
  "created_at"   timestamptz  NOT NULL DEFAULT now(),
  "updated_at"   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "landing_content_unique" UNIQUE ("section", "key", "locale")
);

CREATE INDEX IF NOT EXISTS "idx_landing_section_locale"
  ON "landing_content" ("section", "locale");
