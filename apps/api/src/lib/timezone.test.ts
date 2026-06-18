import { describe, it, expect } from 'vitest';
import { parseDateBoundary } from './timezone.js';

describe('parseDateBoundary', () => {
  it('bare date → local midnight in user tz (Asia/Tashkent = UTC+5)', () => {
    // 2026-06-18 00:00 local Tashkent === 2026-06-17 19:00 UTC
    expect(parseDateBoundary('2026-06-18', 'Asia/Tashkent').toISOString())
      .toBe('2026-06-17T19:00:00.000Z');
  });

  it('endOfDay → last instant of the local day', () => {
    // 2026-06-18 23:59:59.999 local Tashkent === 2026-06-18 18:59:59.999 UTC
    expect(parseDateBoundary('2026-06-18', 'Asia/Tashkent', { endOfDay: true }).toISOString())
      .toBe('2026-06-18T18:59:59.999Z');
  });

  it('regression: HR recorded 03:00 local is NOT excluded by a local-day from', () => {
    // A heart_rate sample at 03:00 Tashkent === 2026-06-17T22:00Z is "today"
    // locally, and falls AFTER the local-day lower bound (2026-06-17T19:00Z) —
    // whereas a naive UTC `new Date('2026-06-18')` (2026-06-18T00:00Z) dropped it.
    const sample = new Date('2026-06-17T22:00:00.000Z');
    const from = parseDateBoundary('2026-06-18', 'Asia/Tashkent');
    expect(sample.getTime()).toBeGreaterThanOrEqual(from.getTime());
    expect(sample.getTime()).toBeLessThan(new Date('2026-06-18T00:00:00.000Z').getTime());
  });

  it('full ISO instant passes through verbatim (UTC-aggregate grid unaffected)', () => {
    expect(parseDateBoundary('2026-06-18T00:00:00.000Z', 'Asia/Tashkent').toISOString())
      .toBe('2026-06-18T00:00:00.000Z');
  });

  it('invalid tz falls back to default (Asia/Tashkent)', () => {
    expect(parseDateBoundary('2026-06-18', 'Not/AZone').toISOString())
      .toBe('2026-06-17T19:00:00.000Z');
  });
});
