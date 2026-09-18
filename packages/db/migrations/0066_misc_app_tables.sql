-- Four independent, small feature tables — declared in the Drizzle schema,
-- all four already exist on production with columns/types/defaults/FKs
-- matching the schema exactly (confirmed read-only 2026-09-18). No-op on
-- prod, closes the disaster-recovery gap. Grouped together (not with
-- pharmacy/landing/medical) since none of them shares a domain with the
-- others — family-card-claiming, family account linking, AI chat archival,
-- and the referral-reward feature.
--
-- One minor, non-blocking divergence noted: prod's ai_chat_archives_user_idx
-- is ON (user_id, created_at DESC) — the schema's index declaration doesn't
-- specify a sort direction. CREATE INDEX IF NOT EXISTS below is a no-op on
-- prod either way (name already exists); on a fresh database it would
-- create the plain ascending form the schema asks for.

CREATE TABLE IF NOT EXISTS "card_claim_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"family_member_id" uuid NOT NULL,
	"parent_user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "family_link_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"family_member_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_chat_archives" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"messages" jsonb DEFAULT '[]' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referred_id" uuid NOT NULL,
	"code" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reward_given" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_referred_id_key" UNIQUE("referred_id")
);
--> statement-breakpoint
ALTER TABLE "card_claim_requests" ADD CONSTRAINT "card_claim_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_claim_requests" ADD CONSTRAINT "card_claim_requests_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_claim_requests" ADD CONSTRAINT "card_claim_requests_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "family_link_requests" ADD CONSTRAINT "family_link_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "family_link_requests" ADD CONSTRAINT "family_link_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "family_link_requests" ADD CONSTRAINT "family_link_requests_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_chat_archives" ADD CONSTRAINT "ai_chat_archives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_claim_req_from_idx" ON "card_claim_requests" ("from_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_claim_req_parent_idx" ON "card_claim_requests" ("parent_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_claim_req_member_idx" ON "card_claim_requests" ("family_member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_link_req_from_idx" ON "family_link_requests" ("from_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_link_req_to_idx" ON "family_link_requests" ("to_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_link_req_member_idx" ON "family_link_requests" ("family_member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_chat_archives_user_idx" ON "ai_chat_archives" ("user_id","created_at");
