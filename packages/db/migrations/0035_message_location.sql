-- 0035: coordinates for location messages.
--
-- message_type already carries 'location' from 0025, but nothing to put in it:
-- attachment_* describes a file, and stuffing "41.31,69.28" into content would
-- make the pin unqueryable and force every client to parse a string.
--
-- double precision, not numeric: these are GPS readings, not money. Postgres
-- float8 holds ~15 significant digits, far past the ~7 that matter at metre
-- resolution, and it is what PostGIS would use if this ever grows into a real
-- geo column.
--
-- Deliberately two plain columns rather than a PostGIS geography type: the MVP
-- shows a single pin and links out to a map, so the extension would be a
-- dependency bought for nothing. Moving to geography(Point) later is a
-- migration, not a redesign.
--
-- Both nullable — every other message type carries neither. There is no CHECK
-- tying them to type='location': a partial constraint would also have to cover
-- the legacy rows written before this column existed.

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "location_lat" double precision;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "location_lng" double precision;
