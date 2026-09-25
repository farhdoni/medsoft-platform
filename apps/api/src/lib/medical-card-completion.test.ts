import { describe, it, expect } from 'vitest';
import { medicalCardCompletion, type CompletionInput } from './medical-card-completion-core.js';

const EMPTY: CompletionInput = { allergiesCount: 0, chronicCount: 0 };

describe('medicalCardCompletion', () => {
  it('empty card is 0 of 14 — empty allergy/chronic lists are NOT answers', () => {
    expect(medicalCardCompletion(EMPTY)).toEqual({ percent: 0, filled: 0, total: 14 });
  });

  it('explicit «нет» counts as answered', () => {
    expect(medicalCardCompletion({ ...EMPTY, allergiesNone: true, chronicNone: true }).filled).toBe(2);
  });

  it('having items counts as answered, with or without the flag', () => {
    expect(medicalCardCompletion({ ...EMPTY, allergiesCount: 2 }).filled).toBe(1);
    expect(medicalCardCompletion({ ...EMPTY, chronicCount: 1, chronicNone: null }).filled).toBe(1);
  });

  it('null / false flag with no items is «не указано»', () => {
    expect(medicalCardCompletion({ ...EMPTY, allergiesNone: null, chronicNone: false }).filled).toBe(0);
  });

  it('blank strings do not count, real values do', () => {
    expect(medicalCardCompletion({ ...EMPTY, name: '  ', city: '', heightCm: 175, weightKg: '70.5' }).filled).toBe(2);
  });

  it('fully answered card is 100%', () => {
    const r = medicalCardCompletion({
      name: 'A', birthDate: '1990-01-01', gender: 'male', phone: '+998', city: 'Tashkent',
      heightCm: 175, weightKg: '70', bloodType: 'A+', smokingStatus: 'never', exerciseFrequency: 'light',
      emergencyContactName: 'B', emergencyContactPhone: '+998',
      allergiesCount: 0, allergiesNone: true, chronicCount: 1,
    });
    expect(r).toEqual({ percent: 100, filled: 14, total: 14 });
  });
});
