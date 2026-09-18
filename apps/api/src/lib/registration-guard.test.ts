import { describe, expect, it } from 'vitest';
import {
  decideRegistration,
  MAX_RESEND_ATTEMPTS_PER_WINDOW,
  RESEND_COOLDOWN_MS,
} from './registration-guard.js';

const NOW = new Date('2026-09-18T12:00:00.000Z');

describe('decideRegistration', () => {
  it('creates normally when nothing matches the email or nickname', () => {
    expect(decideRegistration(null, null, [], NOW)).toEqual({ action: 'create' });
  });

  it('nickname_taken when a different account already has the nickname', () => {
    expect(decideRegistration(null, 'other-user-id', [], NOW)).toEqual({ action: 'nickname_taken' });
  });

  it('already_verified when the matching email account is verified (B3: go sign in)', () => {
    const result = decideRegistration(
      { id: 'u1', emailVerified: new Date('2026-01-01') },
      null,
      [],
      NOW,
    );
    expect(result).toEqual({ action: 'already_verified' });
  });

  it('resend when the matching email account is unverified and no recent code was sent (B2: recover the orphaned account)', () => {
    const result = decideRegistration({ id: 'u1', emailVerified: null }, null, [], NOW);
    expect(result).toEqual({ action: 'resend', userId: 'u1' });
  });

  it('resend_cooldown when the last code for this account was sent under a minute ago', () => {
    const last = new Date(NOW.getTime() - 30_000); // 30s ago
    const result = decideRegistration({ id: 'u1', emailVerified: null }, null, [last], NOW);
    expect(result.action).toBe('resend_cooldown');
    if (result.action === 'resend_cooldown') {
      expect(result.retryAfterSeconds).toBe(30);
    }
  });

  it('resend (not cooldown) once exactly RESEND_COOLDOWN_MS has elapsed', () => {
    const last = new Date(NOW.getTime() - RESEND_COOLDOWN_MS);
    expect(decideRegistration({ id: 'u1', emailVerified: null }, null, [last], NOW))
      .toEqual({ action: 'resend', userId: 'u1' });
  });

  it('too_many_attempts once the recent-code count hits the cap, even past cooldown', () => {
    const codes = Array.from({ length: MAX_RESEND_ATTEMPTS_PER_WINDOW }, (_, i) =>
      new Date(NOW.getTime() - (RESEND_COOLDOWN_MS * 2 + i * 1000)), // all well past cooldown
    );
    expect(decideRegistration({ id: 'u1', emailVerified: null }, null, codes, NOW))
      .toEqual({ action: 'too_many_attempts' });
  });

  it('under the attempt cap still resends normally', () => {
    const codes = Array.from({ length: MAX_RESEND_ATTEMPTS_PER_WINDOW - 1 }, (_, i) =>
      new Date(NOW.getTime() - (RESEND_COOLDOWN_MS * 2 + i * 1000)),
    );
    expect(decideRegistration({ id: 'u1', emailVerified: null }, null, codes, NOW))
      .toEqual({ action: 'resend', userId: 'u1' });
  });

  it('an unverified email match wins over a nickname collision — nickname is only checked when there is no email match', () => {
    // existingByNicknameId is passed but ignored: we're resending to the
    // account matching the submitted email, not creating a new one where
    // a nickname conflict would matter.
    const result = decideRegistration({ id: 'u1', emailVerified: null }, 'some-other-id', [], NOW);
    expect(result).toEqual({ action: 'resend', userId: 'u1' });
  });
});
