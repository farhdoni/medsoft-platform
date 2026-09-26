import { describe, expect, it } from 'vitest';
import {
  isSharpPressureSwing,
  pressureDelta24h,
  PRESSURE_DELTA_THRESHOLD_HPA,
  type HourlyPressure,
} from '../weather-pressure-logic';

function hourlySeries(startIso: string, values: number[]): HourlyPressure {
  const start = new Date(startIso).getTime();
  return {
    time: values.map((_, i) => new Date(start + i * 60 * 60 * 1000).toISOString()),
    surface_pressure: values,
  };
}

describe('pressureDelta24h', () => {
  it('computes current minus the reading closest to 24h ago', () => {
    // 49 hourly points starting 48h before "now" — index 24 is exactly 24h ago
    const values = Array.from({ length: 49 }, (_, i) => 1000 + i); // 1000..1048
    const hourly = hourlySeries('2026-09-24T12:00:00Z', values);
    const nowIso = '2026-09-26T12:00:00Z'; // 48h after start
    // 24h ago = 2026-09-25T12:00:00Z = index 24 → value 1024
    expect(pressureDelta24h(hourly, nowIso, 1030)).toBe(1030 - 1024);
  });

  it('returns null when there is no hourly data', () => {
    expect(pressureDelta24h(null, '2026-09-26T12:00:00Z', 1005)).toBeNull();
    expect(pressureDelta24h({ time: [], surface_pressure: [] }, '2026-09-26T12:00:00Z', 1005)).toBeNull();
  });

  it('returns null when the closest available point is too far from 24h ago', () => {
    // Only 3 hours of history — nowhere near 24h back
    const hourly = hourlySeries('2026-09-26T09:00:00Z', [1000, 1001, 1002]);
    expect(pressureDelta24h(hourly, '2026-09-26T12:00:00Z', 1010)).toBeNull();
  });
});

describe('isSharpPressureSwing — 6 hPa/24h threshold', () => {
  it('flags a drop at/above the threshold', () => {
    expect(isSharpPressureSwing(-PRESSURE_DELTA_THRESHOLD_HPA)).toBe(true);
    expect(isSharpPressureSwing(-10)).toBe(true);
  });

  it('flags a rise at/above the threshold (generalized to either direction)', () => {
    expect(isSharpPressureSwing(PRESSURE_DELTA_THRESHOLD_HPA)).toBe(true);
  });

  it('does not flag a change below the threshold', () => {
    expect(isSharpPressureSwing(5.9)).toBe(false);
    expect(isSharpPressureSwing(-3)).toBe(false);
  });

  it('does not flag when the delta is unknown', () => {
    expect(isSharpPressureSwing(null)).toBe(false);
  });
});
