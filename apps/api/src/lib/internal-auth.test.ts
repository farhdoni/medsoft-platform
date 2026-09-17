import { describe, it, expect } from 'vitest';
import { checkInternalServiceToken } from './internal-auth.js';

describe('checkInternalServiceToken', () => {
  it('returns missing_config when no secret is configured, regardless of header', () => {
    expect(checkInternalServiceToken('anything', undefined)).toBe('missing_config');
    expect(checkInternalServiceToken(undefined, undefined)).toBe('missing_config');
  });

  it('returns invalid when a secret is configured but no header is sent', () => {
    expect(checkInternalServiceToken(undefined, 'the-secret')).toBe('invalid');
    expect(checkInternalServiceToken(null, 'the-secret')).toBe('invalid');
  });

  it('returns invalid when the header does not match the configured secret', () => {
    expect(checkInternalServiceToken('wrong-token', 'the-secret')).toBe('invalid');
  });

  it('returns invalid for a same-length but different token (not just a length check)', () => {
    expect(checkInternalServiceToken('the-secrex', 'the-secret')).toBe('invalid');
  });

  it('returns ok when the header exactly matches the configured secret', () => {
    expect(checkInternalServiceToken('the-secret', 'the-secret')).toBe('ok');
  });

  it('is case-sensitive', () => {
    expect(checkInternalServiceToken('THE-SECRET', 'the-secret')).toBe('invalid');
  });
});
