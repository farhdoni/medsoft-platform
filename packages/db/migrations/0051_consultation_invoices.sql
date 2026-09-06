-- Paid consultations in AV Chat: a doctor bills a patient inside the
-- conversation itself, as a new message type, rather than a separate section.
--
-- 1. message_type gets a new value 'invoice'. Enum values can never be
--    removed without recreating the type, so this is a one-way door — kept
--    to exactly what's needed (the message row itself carries no amount/
--    status; those live in consultation_invoices below, keyed by message id).
--    IF NOT EXISTS makes this safe to rerun.
--
-- 2. consultation_invoices — one row per invoice message. messageId is
--    UNIQUE: a message is at most one invoice, never shared. paymentId stays
--    NULL until paid; it then points at the `payments` row created for that
--    payment (type='consultation', userId=doctorId — the existing payout/
--    earnings convention already reads payments.userId as the doctor, not
--    the payer, confirmed in payouts.ts and doctor/earnings.ts).
ALTER TYPE "message_type" ADD VALUE IF NOT EXISTS 'invoice';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultation_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE cascade,
	"message_id" uuid NOT NULL UNIQUE REFERENCES "messages"("id") ON DELETE cascade,
	"doctor_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE cascade,
	"patient_id" uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE cascade,
	"amount" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"payment_id" integer REFERENCES "payments"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_invoices_doctor_idx" ON "consultation_invoices" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_invoices_patient_idx" ON "consultation_invoices" ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_invoices_status_idx" ON "consultation_invoices" ("status");
