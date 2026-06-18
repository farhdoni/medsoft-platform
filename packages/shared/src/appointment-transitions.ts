import type { AppointmentStatus } from './constants';

/** A doctor's decision on a booking that is awaiting confirmation. */
export type AppointmentDecision = 'confirm' | 'cancel';

/** The status a booking sits in while it awaits the doctor's decision. */
export const PENDING_DECISION_STATUS: AppointmentStatus = 'scheduled';

/** Target status applied for each decision. */
export const DECISION_TARGET_STATUS: Record<AppointmentDecision, AppointmentStatus> = {
  confirm: 'confirmed',
  cancel: 'cancelled_by_doctor',
};

export type AppointmentTransition =
  | { ok: true; status: AppointmentStatus }
  | { ok: false; reason: 'already_handled' };

/**
 * Resolve the next appointment status for a confirm/cancel decision.
 *
 * A decision is only valid while the booking is still pending
 * (`scheduled`). From any other status the booking has already been
 * handled, so the action is rejected as a stale/duplicate decision —
 * mirroring the "first one wins, the rest are no-ops" rule.
 */
export function resolveAppointmentDecision(
  current: AppointmentStatus,
  decision: AppointmentDecision,
): AppointmentTransition {
  if (current !== PENDING_DECISION_STATUS) {
    return { ok: false, reason: 'already_handled' };
  }
  return { ok: true, status: DECISION_TARGET_STATUS[decision] };
}
