import { describe, expect, it } from 'vitest';
import { formatVitalValue, parseItems } from '../patientContext';

function fulfilled(body: unknown, ok = true): PromiseSettledResult<Response> {
  return {
    status: 'fulfilled',
    value: { ok, json: async () => body } as unknown as Response,
  };
}

describe('formatVitalValue', () => {
  it('returns null when there is no value at all (row.value missing/undefined)', () => {
    expect(formatVitalValue('weight', undefined)).toBeNull();
    expect(formatVitalValue('weight', null)).toBeNull();
  });

  it('formats a plain {value, unit} object, not "[object Object]"', () => {
    expect(formatVitalValue('weight', { value: 75.5, unit: 'kg' })).toBe('75.5 kg');
    expect(formatVitalValue('heart_rate', { value: 78, unit: 'уд/мин' })).toBe('78 уд/мин');
  });

  it('formats a value with no unit', () => {
    expect(formatVitalValue('blood_sugar', { value: 6.8 })).toBe('6.8');
  });

  it('formats blood_pressure from systolic/diastolic, ignoring value/unit', () => {
    expect(formatVitalValue('blood_pressure', { systolic: 138, diastolic: 88 })).toBe('138/88');
  });

  it('returns null for blood_pressure missing one of systolic/diastolic', () => {
    expect(formatVitalValue('blood_pressure', { systolic: 138 })).toBeNull();
    expect(formatVitalValue('blood_pressure', { diastolic: 88 })).toBeNull();
  });

  it('returns null when value is 0 is preserved (not falsy-skipped) but empty object is null', () => {
    // 0 is a real, meaningful reading — must not be treated as "no value".
    expect(formatVitalValue('temperature', { value: 0, unit: '°C' })).toBe('0 °C');
    expect(formatVitalValue('weight', {})).toBeNull();
  });
});

describe('parseItems', () => {
  it('reads the {items: [...]} shape GET /vitals?type=... actually returns', () => {
    return expect(parseItems(fulfilled({ items: [{ a: 1 }], total: 1, hasMore: false })))
      .resolves.toEqual([{ a: 1 }]);
  });

  it('returns null for the {data: [...]} shape (this endpoint never sends that)', () => {
    return expect(parseItems(fulfilled({ data: [{ a: 1 }] }))).resolves.toBeNull();
  });

  it('returns null on a rejected fetch', () => {
    return expect(parseItems({ status: 'rejected', reason: new Error('boom') })).resolves.toBeNull();
  });

  it('returns null on a non-ok HTTP response', () => {
    return expect(parseItems(fulfilled({ items: [{ a: 1 }] }, false))).resolves.toBeNull();
  });

  it('returns null when items is missing or not an array', () => {
    return expect(parseItems(fulfilled({ total: 0 }))).resolves.toBeNull();
  });
});
