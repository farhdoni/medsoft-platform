-- MANUAL / one-time data backfill — NOT wired into meta/_journal.json.
-- drizzle's `pnpm --filter @medsoft/db migrate` only applies migrations
-- listed in the journal, so this file is inert to that runner by design.
-- Run it by hand against the target DB after review (e.g. via ssh_db_query
-- or psql). Do not add a journal entry for it.
--
-- Why: doctor_profiles.show_in_catalog defaults to false (see
-- packages/db/src/schema/aivita-doctor.ts). Before the fix to
-- PATCH /v1/aivita-admin/aivita-doctors/:id/verify (this same branch),
-- approving a doctor never flipped show_in_catalog, so every already
-- -verified doctor is invisible in GET /v1/aivita/catalog even though
-- admin marked them verified. New approvals are fixed going forward;
-- this backfills the doctors verified before the fix landed.
--
-- Scope: only doctors currently verified AND active. A rejected/pending
-- doctor is left untouched (should not appear in the catalog). A verified
-- doctor who already has show_in_catalog set (true or explicitly hidden by
-- their own choice) is left untouched — WHERE show_in_catalog = false makes
-- this idempotent and non-destructive to anyone who already toggled the
-- setting themselves.

UPDATE doctor_profiles
SET show_in_catalog = true,
    updated_at = now()
WHERE verification_status = 'verified'
  AND is_active = true
  AND show_in_catalog = false;
