-- Add timezone column to aivita_users.
-- Default 'Asia/Tashkent' ensures all existing rows remain correct — their
-- med.times[] were entered as Tashkent local time and will continue to be
-- interpreted as such after this migration.
ALTER TABLE "aivita_users"
  ADD COLUMN "timezone" text NOT NULL DEFAULT 'Asia/Tashkent';
