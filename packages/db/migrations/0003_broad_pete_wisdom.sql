CREATE TABLE IF NOT EXISTS "medical_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"pin_protected" boolean DEFAULT false NOT NULL,
	"pin_hash" text,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_cards_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "medical_cards_card_code_unique" UNIQUE("card_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sos_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"medical_data_sent" jsonb,
	"sms_sent" boolean DEFAULT false NOT NULL,
	"call_initiated" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_cards" ADD CONSTRAINT "medical_cards_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_user_id_aivita_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aivita_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medical_cards_code_idx" ON "medical_cards" ("card_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sos_events_user_idx" ON "sos_events" ("user_id");