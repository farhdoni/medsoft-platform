import { describe, expect, it } from 'vitest';
import {
  bloodPressureLabel,
  greetingKeyForHour,
  hasEnoughDataForTrend,
  healthScoreDisplay,
  isScreeningDue,
  monthsSince,
  nextIncompleteStage,
  pulseLabel,
  relativeTimeSince,
  selectHomeState,
  sleepLabel,
  TREND_MIN_POINTS,
  TREND_MIN_SPAN_DAYS,
  weightTrend,
  type HomeStateInput,
  type WeightPoint,
} from '../home-state-logic';

const NOW = new Date('2026-09-26T12:00:00Z');

function baseInput(overrides: Partial<HomeStateInput> = {}): HomeStateInput {
  return {
    doctorReplyUnread: false,
    hasCard: true,
    stagesDone: 4,
    hasChronicConditions: false,
    lastLabResultDate: '2026-08-01', // recent — not due
    now: NOW,
    ...overrides,
  };
}

describe('selectHomeState — priority order (reply > paused > empty > diagnosis > healthy > quiet)', () => {
  it('reply wins over every other condition', () => {
    const input = baseInput({
      doctorReplyUnread: true,
      hasCard: false,
      stagesDone: 0,
      hasChronicConditions: true,
    });
    expect(selectHomeState(input)).toBe('reply');
  });

  it('paused: card exists but not all 4 stages done', () => {
    expect(selectHomeState(baseInput({ hasCard: true, stagesDone: 2 }))).toBe('paused');
  });

  it('paused wins over diagnosis/healthy/quiet when both apply', () => {
    expect(selectHomeState(baseInput({ stagesDone: 1, hasChronicConditions: true }))).toBe('paused');
  });

  it('empty: no medical card at all', () => {
    expect(selectHomeState(baseInput({ hasCard: false, stagesDone: 0 }))).toBe('empty');
  });

  it('empty wins over diagnosis when there is no card yet', () => {
    expect(selectHomeState(baseInput({ hasCard: false, stagesDone: 0, hasChronicConditions: true }))).toBe('empty');
  });

  it('diagnosis: complete card, chronic condition on file', () => {
    expect(selectHomeState(baseInput({ hasChronicConditions: true }))).toBe('diagnosis');
  });

  it('healthy: no chronic conditions, screening overdue', () => {
    expect(selectHomeState(baseInput({ lastLabResultDate: '2025-06-01' }))).toBe('healthy');
  });

  it('healthy: no chronic conditions, no lab result on file at all (soft prompt, not "quiet")', () => {
    expect(selectHomeState(baseInput({ lastLabResultDate: null }))).toBe('healthy');
  });

  it('quiet: no chronic conditions, screening recent enough — the default fallback', () => {
    expect(selectHomeState(baseInput({ lastLabResultDate: '2026-08-01' }))).toBe('quiet');
  });
});

describe('isScreeningDue / monthsSince', () => {
  it('is due with no lab date recorded', () => {
    expect(isScreeningDue(null, NOW)).toBe(true);
  });

  it('is due at/after the 11-month threshold', () => {
    expect(isScreeningDue('2025-10-01', NOW)).toBe(true); // ~11.8 months
  });

  it('is not due comfortably inside the threshold', () => {
    expect(isScreeningDue('2026-08-01', NOW)).toBe(false); // ~1.8 months
  });

  it('monthsSince is monotonic with elapsed time', () => {
    expect(monthsSince('2026-08-01', NOW)).toBeLessThan(monthsSince('2026-01-01', NOW));
  });
});

describe('nextIncompleteStage — paused state next-step CTA', () => {
  it('checkup first when nothing past questionnaire is done', () => {
    expect(nextIncompleteStage({ questionnaire: true, checkup: false, gadgets: false, documents: false })).toBe('checkup');
  });

  it('gadgets next once checkup is done', () => {
    expect(nextIncompleteStage({ questionnaire: true, checkup: true, gadgets: false, documents: false })).toBe('gadgets');
  });

  it('documents last', () => {
    expect(nextIncompleteStage({ questionnaire: true, checkup: true, gadgets: true, documents: false })).toBe('documents');
  });

  it('null when all 4 are done (should not be reachable from selectHomeState, but the function is honest either way)', () => {
    expect(nextIncompleteStage({ questionnaire: true, checkup: true, gadgets: true, documents: true })).toBeNull();
  });

  it('field-presence order, not questionnaire — a gap in checkup only still returns checkup even if gadgets/documents are somehow already done', () => {
    expect(nextIncompleteStage({ questionnaire: true, checkup: false, gadgets: true, documents: true })).toBe('checkup');
  });
});

describe('healthScoreDisplay — null (never calculated) vs a genuine 0', () => {
  it('null row → no score to show, not "0"', () => {
    expect(healthScoreDisplay(null)).toEqual({ hasScore: false });
  });

  it('a genuine 0 is shown as a real score, not misread as "no data"', () => {
    expect(healthScoreDisplay({ total: 0, calculatedAt: '2026-09-01T00:00:00Z' })).toEqual({
      hasScore: true,
      total: 0,
      label: 'требует внимания',
    });
  });

  it('a high score gets the "отлично" label', () => {
    expect(healthScoreDisplay({ total: 85, calculatedAt: '2026-09-01T00:00:00Z' }).label).toBe('отлично');
  });
});

describe('hasEnoughDataForTrend — edge case: too little data for a trend conclusion', () => {
  it('fewer than the minimum point count → not enough, even if spread wide', () => {
    expect(hasEnoughDataForTrend([
      { date: '2026-06-01' },
      { date: '2026-09-01' },
    ])).toBe(false);
  });

  it('enough points but all clustered in one week → not enough (no real spread)', () => {
    const points = Array.from({ length: 6 }, (_, i) => ({ date: `2026-09-${10 + i}` }));
    expect(hasEnoughDataForTrend(points)).toBe(false);
  });

  it('meets both the point-count and span minimums → enough for a trend', () => {
    expect(hasEnoughDataForTrend([
      { date: '2026-06-10' },
      { date: '2026-07-15' },
      { date: '2026-08-20' },
      { date: '2026-09-25' },
    ])).toBe(true);
  });

  it('exactly at the minimums is still enough (boundary, not exclusive)', () => {
    const start = new Date('2026-08-01T00:00:00Z');
    const end = new Date(start.getTime() + TREND_MIN_SPAN_DAYS * 24 * 60 * 60 * 1000);
    const points = [
      { date: start.toISOString() },
      { date: '2026-08-15' },
      { date: '2026-09-01' },
      { date: end.toISOString() },
    ];
    expect(points.length).toBe(TREND_MIN_POINTS);
    expect(hasEnoughDataForTrend(points)).toBe(true);
  });
});

describe('weightTrend — gated by the same trend-sufficiency check', () => {
  const spread: WeightPoint[] = [
    { date: '2026-06-10', kg: 82 },
    { date: '2026-07-15', kg: 83 },
    { date: '2026-08-20', kg: 84 },
    { date: '2026-09-25', kg: 86 },
  ];

  it('unknown when there is not enough data (edge case, same as the trend gate)', () => {
    expect(weightTrend([{ date: '2026-09-01', kg: 82 }, { date: '2026-09-20', kg: 84 }])).toEqual({ kind: 'unknown' });
  });

  it('steady when the change is within the noise floor', () => {
    const steady: WeightPoint[] = spread.map((p, i) => ({ ...p, kg: 82 + (i % 2) }));
    expect(weightTrend(steady)).toEqual({ kind: 'steady' });
  });

  it('reports a real earliest-vs-latest delta when it exceeds the noise floor', () => {
    expect(weightTrend(spread)).toEqual({ kind: 'change', deltaKg: 4 });
  });
});

describe('bloodPressureLabel / pulseLabel / sleepLabel — standard clinical cutoffs', () => {
  it('flags hypertension-range systolic or diastolic as high', () => {
    expect(bloodPressureLabel(142, 91)).toBe('high');
    expect(bloodPressureLabel(120, 91)).toBe('high');
    expect(bloodPressureLabel(142, 80)).toBe('high');
  });

  it('normal blood pressure', () => {
    expect(bloodPressureLabel(120, 80)).toBe('normal');
  });

  it('pulse ranges', () => {
    expect(pulseLabel(45)).toBe('low');
    expect(pulseLabel(74)).toBe('normal');
    expect(pulseLabel(110)).toBe('high');
  });

  it('sleep under 7h reads as low', () => {
    expect(sleepLabel(6.1)).toBe('low');
    expect(sleepLabel(7.4)).toBe('normal');
  });
});

describe('greetingKeyForHour', () => {
  it('maps each part of the day', () => {
    expect(greetingKeyForHour(8)).toBe('morning');
    expect(greetingKeyForHour(14)).toBe('day');
    expect(greetingKeyForHour(20)).toBe('evening');
    expect(greetingKeyForHour(2)).toBe('night');
  });

  it('boundaries are inclusive on both ends of each band', () => {
    expect(greetingKeyForHour(5)).toBe('morning');
    expect(greetingKeyForHour(11)).toBe('morning');
    expect(greetingKeyForHour(12)).toBe('day');
    expect(greetingKeyForHour(23)).toBe('night');
    expect(greetingKeyForHour(0)).toBe('night');
  });
});

describe('relativeTimeSince', () => {
  const now = new Date('2026-09-26T12:00:00Z');

  it('minutes under an hour', () => {
    expect(relativeTimeSince('2026-09-26T11:48:00Z', now)).toEqual({ unit: 'minutes', value: 12 });
  });

  it('hours under a day', () => {
    expect(relativeTimeSince('2026-09-26T05:00:00Z', now)).toEqual({ unit: 'hours', value: 7 });
  });

  it('days beyond a day', () => {
    expect(relativeTimeSince('2026-09-23T12:00:00Z', now)).toEqual({ unit: 'days', value: 3 });
  });

  it('never negative even if the clock is slightly behind the message', () => {
    expect(relativeTimeSince('2026-09-26T12:00:05Z', now)).toEqual({ unit: 'minutes', value: 1 });
  });
});
