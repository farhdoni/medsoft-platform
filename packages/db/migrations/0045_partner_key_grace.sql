-- 0045: grace-period key rotation for partner_clinics (ecosystem/v1).
--
-- Before this, issue-key overwrote api_key_hash unconditionally: the new key
-- killed the old one the instant it was issued, so a real clinic's exchange
-- traffic broke mid-day the moment a key was rotated. This adds a bounded
-- overlap window where BOTH the new and the previous key authenticate.
--
--   * previous_api_key_hash    -> bcrypt hash of the key that was current
--                                 right before the latest rotation. Null when
--                                 no rotation has happened, or after the old
--                                 key has been revoked/expired-and-cleared.
--   * previous_key_expires_at  -> absolute instant the previous key stops
--                                 being accepted. NULL means no live previous
--                                 key. partner-auth checks this at auth time,
--                                 so an expired old key is refused with no
--                                 background cleanup job required.
--
-- Immediate revocation of the previous key (leak mid-window) is just setting
-- both columns back to NULL — see POST /:code/revoke-previous-key.

ALTER TABLE "partner_clinics" ADD COLUMN IF NOT EXISTS "previous_api_key_hash" text;
--> statement-breakpoint
ALTER TABLE "partner_clinics" ADD COLUMN IF NOT EXISTS "previous_key_expires_at" timestamptz;
