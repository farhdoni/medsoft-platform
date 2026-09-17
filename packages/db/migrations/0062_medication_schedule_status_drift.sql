-- medication_schedule.status — declared in the Drizzle schema
-- (packages/db/src/schema/aivita-medications.ts) but missing from every
-- migration file, same class of drift as 0061's health_profiles columns.
-- Found while measuring buildPatientContext output on a DB built purely
-- from migrations: GET /v1/aivita/medications throws "column status does
-- not exist" there (42703), because the route filters on it.
--
-- Confirmed read-only against production first: the column already
-- exists there (someone ran drizzle-kit push directly against prod at
-- some point) with exactly this type/nullability/default — varchar(20)
-- NOT NULL DEFAULT 'active' — so this migration is a no-op on prod today.
-- Its purpose is the same disaster-recovery gap as 0061: rebuilding the
-- schema from migrations alone would otherwise silently miss this column
-- and break GET /medications on a fresh database.

ALTER TABLE "medication_schedule"
  ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'active';
