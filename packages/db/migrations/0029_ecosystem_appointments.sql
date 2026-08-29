-- ecosystem_appointments: an inbound record of an appointment fact pushed by
-- a partner clinic (e.g. MedSoft) about their own patient. ecosystem/v1
-- exchange module, first live endpoint (brick 1: migration 0026
-- aivita_users.external_id, brick 2: migration 0027 identity_links, brick 3:
-- migration 0028 partner_clinics, brick 4: requirePartnerAuth, brick 5:
-- resolvePatientLink).
--
-- Deliberately NOT the legacy `appointments` table or `aivita_appointments`:
-- both FK doctor_id to a directory of doctors AIVITA itself operates
-- (`doctors` / `aivita_users` with role='doctor'). The doctor and the slot
-- here belong to the PARTNER, not AIVITA — there is no AIVITA doctor row to
-- point at, and fabricating one per partner physician would be worse than a
-- dedicated table. doctor_label/service_label are plain text in the
-- partner's own vocabulary, not FKs.
--
-- Anti-double-booking for THIS endpoint is exchange-level idempotency, not
-- slot-conflict checking: AIVITA doesn't own the partner's slot and can't
-- validate whether it's free — the partner already decided that before
-- pushing. UNIQUE(partner_code, partner_appointment_id) is the same
-- ON-CONFLICT-DO-NOTHING idempotency pattern identity_links already uses
-- (migration 0027) for the identical reason: never check-then-insert.

CREATE TABLE IF NOT EXISTS "ecosystem_appointments" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "person_id"              uuid NOT NULL REFERENCES "aivita_users"("id") ON DELETE CASCADE,
  "partner_code"           text NOT NULL REFERENCES "partner_clinics"("code"),
  "partner_local_id"       text NOT NULL,
  "partner_appointment_id" text NOT NULL,
  "scheduled_at"           timestamptz NOT NULL,
  "service_label"          text,
  "doctor_label"           text,
  "status"                 text NOT NULL DEFAULT 'scheduled',
  "created_at"             timestamptz NOT NULL DEFAULT now(),
  "updated_at"             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ecosystem_appointments_person_idx" ON "ecosystem_appointments" ("person_id");
CREATE INDEX IF NOT EXISTS "ecosystem_appointments_partner_idx" ON "ecosystem_appointments" ("partner_code");

-- Idempotency key for the partner exchange: replaying the same push (same
-- partner_appointment_id) must return the same row, never a duplicate.
ALTER TABLE "ecosystem_appointments"
  ADD CONSTRAINT "ecosystem_appointments_partner_unique" UNIQUE ("partner_code", "partner_appointment_id");
