-- 0036: per-participant conversation preferences — pin, mute, archive.
--
-- These live on conversation_participants, not on conversations: pinning and
-- muting are one person's view of a chat. If they sat on the conversation row,
-- one participant archiving it would archive it for everyone.
--
-- All three are timestamps rather than booleans, and each earns it:
--
--   pinned_at    orders the pinned block. A boolean would leave "which pin is
--                first" undefined, and people expect the most recently pinned
--                chat on top.
--
--   muted_until  expresses "muted for an hour" as naturally as "muted", which
--                a boolean cannot. NULL means not muted; a far-future value is
--                how "forever" is written. The push path compares it to now(),
--                so an expired mute needs no cleanup job.
--
--   archived_at  keeps when it was archived, which is what an "archived
--                recently" view would need later, and costs nothing now.
--
-- timestamptz(3) matches every other timestamp in the AV Chat tables: the API
-- serialises to millisecond precision, and microseconds that cannot round-trip
-- through JSON caused a real polling bug once already (see 0034's note).
--
-- All nullable, no defaults: absence is the unset state for all three.

ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "pinned_at"   timestamptz(3);
--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "muted_until" timestamptz(3);
--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz(3);
--> statement-breakpoint

-- The conversation list filters the caller's rows by archived state on every
-- load, and orders the pinned block by pinned_at.
CREATE INDEX IF NOT EXISTS "conv_participants_user_archived_idx"
  ON "conversation_participants" ("user_id", "archived_at");
