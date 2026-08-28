-- 0034: media fields for AV Chat messages.
--
-- 0025 already carries attachment_url / attachment_name / attachment_mime /
-- attachment_size, which cover photos, documents and the audio blob itself.
-- Two things they cannot express:
--
--   duration_seconds — a voice message must render its length in the bubble
--     before the audio is fetched, otherwise every player shows 0:00 until the
--     file downloads. Stored as whole seconds; the client rounds.
--
--   preview_url — a still/poster frame separate from the played asset. Needed
--     for GIFs, where attachment_url points at the provider's animated file and
--     preview_url at its static thumbnail, so a long list of GIFs does not
--     animate all at once.
--
-- Both are nullable: a text message carries neither.
--
-- Note on GIFs: attachment_url holds the provider's remote URL. We deliberately
-- do not copy the file into our own uploads dir — that would turn every sent
-- GIF into megabytes of storage we then have to serve, for content the provider
-- already hosts on a CDN.

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "preview_url" text;
