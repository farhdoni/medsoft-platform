import { describe, it, expect } from 'vitest';
import { computeCostUsd } from './ai-pricing.js';

describe('computeCostUsd', () => {
  it('prices plain input+output tokens with no caching', () => {
    // 1,000,000 input @ $3/MTok + 1,000,000 output @ $15/MTok = $18
    const cost = computeCostUsd('claude-sonnet-4-6', 1_000_000, 1_000_000, 0, 0);
    expect(cost).toBe(18);
  });

  it('prices a cache write at the 1.25x 5-minute rate', () => {
    // 1,000,000 cache-creation tokens @ $3.75/MTok = $3.75
    const cost = computeCostUsd('claude-sonnet-4-6', 0, 0, 1_000_000, 0);
    expect(cost).toBe(3.75);
  });

  it('prices a cache read at the 0.1x rate', () => {
    // 1,000,000 cache-read tokens @ $0.30/MTok = $0.30
    const cost = computeCostUsd('claude-sonnet-4-6', 0, 0, 0, 1_000_000);
    expect(cost).toBe(0.3);
  });

  it('sums all four token categories in one request', () => {
    const cost = computeCostUsd('claude-sonnet-4-6', 500, 200, 800, 5000);
    // (500*3 + 200*15 + 800*3.75 + 5000*0.30) / 1e6
    const expected = (500 * 3 + 200 * 15 + 800 * 3.75 + 5000 * 0.3) / 1_000_000;
    expect(cost).toBeCloseTo(expected, 9);
  });

  it('rounds to 6 decimal places to match the numeric(8,6) column', () => {
    const cost = computeCostUsd('claude-sonnet-4-6', 1, 1, 0, 0);
    expect(cost).toBe(0.000018);
  });

  it.each(['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-haiku-4-5-20251001'])(
    'has pricing for %s (every model actually called by the 13 audited call sites)',
    (model) => {
      expect(computeCostUsd(model, 100, 100, 0, 0)).not.toBeNull();
    },
  );

  it('returns null for an unknown model instead of a wrong number', () => {
    expect(computeCostUsd('claude-opus-4-7', 100, 100, 0, 0)).toBeNull();
  });

  it('returns 0 for an all-zero request', () => {
    expect(computeCostUsd('claude-sonnet-4-6', 0, 0, 0, 0)).toBe(0);
  });
});
