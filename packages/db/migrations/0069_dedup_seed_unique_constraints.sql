-- Migrations 0008 (drug_interactions) and 0012 (email_templates) already
-- wrote their seed INSERTs with "ON CONFLICT DO NOTHING" — but neither
-- table had a unique constraint for that clause to key off, so it was a
-- silent no-op: every full migration re-run (every deploy, this project's
-- migration runner has no per-file tracking table) re-inserted the same
-- seed rows again. Confirmed on production: drug_interactions' 20 seed
-- pairs had accumulated to 125 copies each (2500 of 2515 rows); every one
-- of email_templates' 5 rows had accumulated to 126 copies (630 total).
--
-- This migration does NOT delete anything — it only adds the missing
-- constraints, once the duplicate rows have already been removed on this
-- database (see the accompanying cleanup plan). If duplicates are still
-- present, the ADD CONSTRAINT statements below fail loudly (Postgres
-- refuses a UNIQUE constraint over duplicate values) rather than silently
-- doing nothing — that failure is the intended signal that cleanup hasn't
-- run here yet.
--
-- Once these constraints exist, 0008's and 0012's own "ON CONFLICT DO
-- NOTHING" starts working exactly as originally intended, on every future
-- re-run — neither migration file itself needs to change.

-- A named UNIQUE constraint implicitly creates a backing index of the same
-- name — on a second run that index already exists, and Postgres raises
-- duplicate_table (42P07) for THAT, not duplicate_object (42710) for the
-- constraint itself. A bare "WHEN duplicate_object" guard does not catch
-- this (confirmed live: it re-raised on the second run). Same gotcha
-- already documented in 0066.
DO $$ BEGIN
  ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_name_key" UNIQUE ("name");
EXCEPTION
  WHEN duplicate_object OR duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_pair_severity_key" UNIQUE ("drug1","drug2","severity");
EXCEPTION
  WHEN duplicate_object OR duplicate_table THEN null;
END $$;
