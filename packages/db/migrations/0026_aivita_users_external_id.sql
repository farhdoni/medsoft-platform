-- external_id: stable, non-public person identifier for the AIVITA ecosystem/v1
-- exchange module. Deliberately separate from aivita_users.id (internal PK) —
-- id must never be handed to partners; external_id is what gets exposed instead.
--
-- 3-step rollout because the column must end up NOT NULL + UNIQUE but existing
-- rows have no value yet:
--   1) add nullable
--   2) backfill — one independently generated uuid per existing row (NOT a
--      single shared default, which would collide the moment we add UNIQUE)
--   3) lock it down: NOT NULL + UNIQUE + index

ALTER TABLE "aivita_users"
  ADD COLUMN IF NOT EXISTS "external_id" uuid;

UPDATE "aivita_users"
  SET "external_id" = gen_random_uuid()
  WHERE "external_id" IS NULL;

ALTER TABLE "aivita_users"
  ALTER COLUMN "external_id" SET NOT NULL;

ALTER TABLE "aivita_users"
  ADD CONSTRAINT "aivita_users_external_id_unique" UNIQUE ("external_id");

CREATE INDEX IF NOT EXISTS "aivita_users_external_id_idx" ON "aivita_users" ("external_id");
