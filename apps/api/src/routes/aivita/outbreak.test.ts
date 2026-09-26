import { describe, expect, it } from 'vitest';
import { symptomReportSchema } from './outbreak.js';

// Confirms the 400-vs-500 distinction directly: zValidator rejects a
// payload that fails this schema with its own 400 before the handler (and
// any DB insert) ever runs — so a missing required field can never surface
// as a 500 from a NOT NULL violation instead. See the schema's own comment
// for why diseaseCategory/severity became required (product decision
// 2026-09-26).

const validPayload = {
  city: 'Ташкент',
  symptomType: 'fever' as const,
  diseaseCategory: 'orvi' as const,
  severity: 'moderate' as const,
};

describe('symptomReportSchema', () => {
  it('accepts a complete valid payload', () => {
    const result = symptomReportSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing diseaseCategory', () => {
    const { diseaseCategory: _omit, ...payload } = validPayload;
    const result = symptomReportSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing severity', () => {
    const { severity: _omit, ...payload } = validPayload;
    const result = symptomReportSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing both diseaseCategory and severity', () => {
    const { diseaseCategory: _d, severity: _s, ...payload } = validPayload;
    const result = symptomReportSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('still allows temperature to be omitted (genuinely optional)', () => {
    const result = symptomReportSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    expect(result.success && result.data.temperature).toBeUndefined();
  });

  it('defaults source to manual when omitted', () => {
    const result = symptomReportSchema.safeParse(validPayload);
    expect(result.success && result.data.source).toBe('manual');
  });
});
