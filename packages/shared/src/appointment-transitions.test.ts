import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAppointmentDecision,
  DECISION_TARGET_STATUS,
  PENDING_DECISION_STATUS,
} from './appointment-transitions';
import { APPOINTMENT_STATUSES } from './constants';

test('confirm from scheduled -> confirmed', () => {
  const r = resolveAppointmentDecision('scheduled', 'confirm');
  assert.deepEqual(r, { ok: true, status: 'confirmed' });
});

test('cancel from scheduled -> cancelled_by_doctor', () => {
  const r = resolveAppointmentDecision('scheduled', 'cancel');
  assert.deepEqual(r, { ok: true, status: 'cancelled_by_doctor' });
});

test('decision target statuses are valid appointment statuses', () => {
  assert.ok(APPOINTMENT_STATUSES.includes(DECISION_TARGET_STATUS.confirm));
  assert.ok(APPOINTMENT_STATUSES.includes(DECISION_TARGET_STATUS.cancel));
  assert.ok(APPOINTMENT_STATUSES.includes(PENDING_DECISION_STATUS));
});

test('any non-pending status is rejected as already handled (stale-safe)', () => {
  for (const status of APPOINTMENT_STATUSES) {
    if (status === PENDING_DECISION_STATUS) continue;
    for (const decision of ['confirm', 'cancel'] as const) {
      const r = resolveAppointmentDecision(status, decision);
      assert.deepEqual(
        r,
        { ok: false, reason: 'already_handled' },
        `expected ${status}/${decision} to be already_handled`,
      );
    }
  }
});

test('a second decision after confirm is a no-op (first one wins)', () => {
  const first = resolveAppointmentDecision('scheduled', 'confirm');
  assert.ok(first.ok);
  // booking is now 'confirmed'; a competing cancel must be rejected
  const second = resolveAppointmentDecision(first.status, 'cancel');
  assert.deepEqual(second, { ok: false, reason: 'already_handled' });
});
