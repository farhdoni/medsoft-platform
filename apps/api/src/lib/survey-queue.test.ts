import { describe, it, expect } from 'vitest';
import {
  pickNextField,
  startOfTodayTashkent,
  canonicalizeBloodType,
  isValidHeightCm,
  isValidWeightKg,
  isValidEnumAnswer,
  SURVEY_FIELD_PRIORITY,
  type SurveyEvent,
  type FilledState,
} from './survey-queue.js';

const EMPTY_FILLED: FilledState = {
  emergencyContactPhone: false,
  gender: false,
  allergies: false,
  medications: false,
  chronicDiseases: false,
  heightCm: false,
  weightKg: false,
  bloodType: false,
  phone: false,
  city: false,
  smokingStatus: false,
  alcohol: false,
  activity: false,
  doctorName: false,
  clinic: false,
};

// A fixed "now" inside a Tashkent (UTC+5) calendar day, with a matching
// start-of-day boundary — mirrors how timezone.test.ts pins its instants.
const NOW = new Date('2026-06-18T10:00:00.000Z'); // 15:00 Tashkent, 2026-06-18
const START_OF_TODAY = startOfTodayTashkent(NOW); // 2026-06-17T19:00:00.000Z

function ev(field: SurveyEvent['field'], status: SurveyEvent['status'], createdAt: Date): SurveyEvent {
  return { field, status, createdAt };
}

// These tests are about ORDER, not about any specific field's identity —
// referencing SURVEY_FIELD_PRIORITY by index (rather than hardcoding e.g.
// 'allergies') keeps them meaningful regardless of how the list is
// reprioritized (as it was for Part B, 2026-09-25: allergies moved from
// index 0 to index 4). pickNextField itself is field-type-agnostic — it
// only ever compares opaque SurveyField keys — so substituting which three
// fields stand in for "first/second/third priority" changes nothing about
// what these tests actually verify.
const P0 = SURVEY_FIELD_PRIORITY[0];
const P1 = SURVEY_FIELD_PRIORITY[1];
const P2 = SURVEY_FIELD_PRIORITY[2];

describe('pickNextField — priority order', () => {
  it('picks the first unfilled field in SURVEY_FIELD_PRIORITY when nothing has happened yet', () => {
    const result = pickNextField([], EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result).toEqual({ field: P0, isNew: true });
  });

  it('skips filled fields and picks the next eligible one in order', () => {
    const filled: FilledState = { ...EMPTY_FILLED, [P0]: true, [P1]: true };
    const result = pickNextField([], filled, NOW, START_OF_TODAY);
    expect(result?.field).toBe(P2);
  });
});

describe('pickNextField — closed via an answered event (incl. "none" answers)', () => {
  it('a field with an answered event is never re-offered, even though filled[field] is still false', () => {
    // Exactly the "нет аллергий" / "не принимаю" case: no table row was ever
    // written, only the answered event — filled state stays false forever.
    const events = [ev(P0, 'answered', new Date('2026-06-01T00:00:00.000Z'))];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result?.field).toBe(P1);
  });

  it('real data (filled=true) closes a field exactly like an answered event does', () => {
    const filled: FilledState = { ...EMPTY_FILLED, [P0]: true };
    const result = pickNextField([], filled, NOW, START_OF_TODAY);
    expect(result?.field).toBe(P1);
  });
});

describe('pickNextField — 7-day skip cooldown', () => {
  it('a field skipped 3 days ago is NOT re-offered (inside the 7-day window)', () => {
    const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    const events = [ev(P0, 'skipped', threeDaysAgo)];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result?.field).toBe(P1);
  });

  it('a field skipped 8 days ago IS re-offered (outside the 7-day window)', () => {
    const eightDaysAgo = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    const events = [ev(P0, 'skipped', eightDaysAgo)];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result).toEqual({ field: P0, isNew: true });
  });

  it('cooldown boundary is configurable via opts (custom cooldownDays)', () => {
    const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
    const events = [ev(P0, 'skipped', twoDaysAgo)];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY, { cooldownDays: 1 });
    expect(result?.field).toBe(P0); // 2 days > 1-day cooldown -> eligible again
  });
});

describe('pickNextField — idempotency of repeated /next calls', () => {
  it('a field shown today with no later event today is returned again, isNew: false (no duplicate row)', () => {
    const shownEarlierToday = new Date(START_OF_TODAY.getTime() + 60 * 60 * 1000); // 1h into today
    const events = [ev(P0, 'shown', shownEarlierToday)];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result).toEqual({ field: P0, isNew: false });
  });

  it('once answered today, the NEXT field is offered fresh (isNew: true), not re-asking the answered one', () => {
    const shownEarlierToday = new Date(START_OF_TODAY.getTime() + 60 * 60 * 1000);
    const answeredLaterToday = new Date(START_OF_TODAY.getTime() + 2 * 60 * 60 * 1000);
    const events = [
      ev(P0, 'shown', shownEarlierToday),
      ev(P0, 'answered', answeredLaterToday),
    ];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result).toEqual({ field: P1, isNew: true });
  });

  it('a shown event from a PRIOR day does not trigger idempotent re-ask today', () => {
    const yesterday = new Date(START_OF_TODAY.getTime() - 60 * 60 * 1000); // 1h before today started
    const events = [ev(P0, 'shown', yesterday)];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    // Not idempotent-returned (that only applies to TODAY's shown events) —
    // and not filled/answered/in-cooldown either, so it's freely offered again.
    expect(result).toEqual({ field: P0, isNew: true });
  });
});

describe('pickNextField — shared daily limit of 3 distinct fields', () => {
  it('returns null once 3 different fields have a shown-today event, even with eligible fields left', () => {
    const t = (h: number) => new Date(START_OF_TODAY.getTime() + h * 60 * 60 * 1000);
    const events = [
      ev('allergies', 'shown', t(1)),
      ev('allergies', 'answered', t(1.1)),
      ev('medications', 'shown', t(2)),
      ev('medications', 'skipped', t(2.1)),
      ev('chronicDiseases', 'shown', t(3)),
      ev('chronicDiseases', 'answered', t(3.1)),
    ];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result).toBeNull();
  });

  it('the limit counts DISTINCT fields, not events — one field shown+skipped is 1 slot, not 2', () => {
    const t = (h: number) => new Date(START_OF_TODAY.getTime() + h * 60 * 60 * 1000);
    const events = [
      ev(P0, 'shown', t(1)),
      ev(P0, 'skipped', t(1.1)),
    ];
    // 1 distinct field shown today (P0) — well under the limit of 3. P0
    // itself is now in its skip cooldown, so the next distinct pick should
    // be P1.
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY);
    expect(result?.field).toBe(P1);
  });

  it('limit is configurable via opts (custom dailyLimit)', () => {
    const t = (h: number) => new Date(START_OF_TODAY.getTime() + h * 60 * 60 * 1000);
    const events = [ev('allergies', 'shown', t(1)), ev('allergies', 'answered', t(1.1))];
    const result = pickNextField(events, EMPTY_FILLED, NOW, START_OF_TODAY, { dailyLimit: 1 });
    expect(result).toBeNull();
  });
});

describe('startOfTodayTashkent — Asia/Tashkent day boundary, not UTC', () => {
  it('an event at 22:00 UTC (03:00 next day Tashkent) counts as "today" Tashkent, not "today" UTC', () => {
    // 2026-06-17T22:00Z = 2026-06-18 03:00 Tashkent -> already "today" (2026-06-18) locally.
    const lateUtcEvent = new Date('2026-06-17T22:00:00.000Z');
    const startOfJune18Tashkent = startOfTodayTashkent(new Date('2026-06-18T10:00:00.000Z'));
    expect(lateUtcEvent.getTime()).toBeGreaterThanOrEqual(startOfJune18Tashkent.getTime());

    // A naive UTC-midnight boundary would have wrongly excluded it (it's
    // before 2026-06-18T00:00:00Z) — this is exactly the bug this function
    // exists to avoid, per apps/api/src/lib/timezone.ts's own regression test.
    const naiveUtcMidnight = new Date('2026-06-18T00:00:00.000Z');
    expect(lateUtcEvent.getTime()).toBeLessThan(naiveUtcMidnight.getTime());
  });

  it('picking with a Tashkent-day-boundary correctly separates yesterday from today across the UTC date line', () => {
    // An "shown" event at 2026-06-17T20:00Z is 2026-06-18 01:00 Tashkent — i.e.
    // it belongs to TODAY (2026-06-18) in Tashkent even though its UTC date
    // string is still "2026-06-17". If day-bucketing used bare UTC dates, this
    // event would be wrongly treated as yesterday and idempotency would break
    // (a duplicate 'shown' row could be written for the same local day).
    const now = new Date('2026-06-18T10:00:00.000Z'); // 15:00 Tashkent
    const startOfToday = startOfTodayTashkent(now);
    const shownEvent = new Date('2026-06-17T20:00:00.000Z'); // 01:00 Tashkent, 2026-06-18
    const result = pickNextField([ev('allergies', 'shown', shownEvent)], EMPTY_FILLED, now, startOfToday);
    expect(result).toEqual({ field: 'allergies', isNew: false });
  });
});

describe('canonicalizeBloodType — answer validation', () => {
  it.each([
    ['A+', 'A+'],
    ['a+', 'A+'],
    ['a -', 'A-'],
    ['O+', 'O+'],
    ['AB-', 'AB-'],
    ['ab+', 'AB+'],
    ['B−', 'B-'], // typographic minus
    ['  b + ', 'B+'],
  ])('parses %s -> %s', (input, expected) => {
    expect(canonicalizeBloodType(input)).toBe(expected);
  });

  it.each([
    ['not blood', null],
    ['A', null], // letter with no Rh sign
    ['', null],
    ['XY+', null],
  ])('rejects %s', (input, expected) => {
    expect(canonicalizeBloodType(input)).toBe(expected);
  });
});

describe('isValidHeightCm / isValidWeightKg — range validation', () => {
  it('accepts the documented bounds inclusive', () => {
    expect(isValidHeightCm(50)).toBe(true);
    expect(isValidHeightCm(250)).toBe(true);
    expect(isValidWeightKg(20)).toBe(true);
    expect(isValidWeightKg(300)).toBe(true);
  });

  it('rejects just outside the bounds', () => {
    expect(isValidHeightCm(49)).toBe(false);
    expect(isValidHeightCm(251)).toBe(false);
    expect(isValidWeightKg(19.9)).toBe(false);
    expect(isValidWeightKg(300.1)).toBe(false);
  });

  it('rejects non-finite input', () => {
    expect(isValidHeightCm(NaN)).toBe(false);
    expect(isValidHeightCm(Infinity)).toBe(false);
  });
});

describe('isValidEnumAnswer — only the defined option set per field', () => {
  it('accepts an exact option value', () => {
    expect(isValidEnumAnswer('smokingStatus', 'quit')).toBe(true);
    expect(isValidEnumAnswer('alcohol', 'rarely')).toBe(true);
    expect(isValidEnumAnswer('activity', 'sedentary')).toBe(true);
  });

  it('rejects a value from a DIFFERENT field\'s option set (never/light/etc. are not interchangeable)', () => {
    expect(isValidEnumAnswer('smokingStatus', 'light')).toBe(false); // that's an activity value
  });

  it('rejects a field with no options (e.g. list-typed fields)', () => {
    expect(isValidEnumAnswer('allergies', 'never')).toBe(false);
  });
});
