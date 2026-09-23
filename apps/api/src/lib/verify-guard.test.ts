import { describe, expect, it } from 'vitest';
import { checkVerifyLock, nextVerifyLockState, MAX_VERIFY_ATTEMPTS, VERIFY_LOCKOUT_MS } from './verify-guard.js';

const NOW = new Date('2026-09-23T12:00:00.000Z');

describe('checkVerifyLock', () => {
  it('not locked when lockedUntil is null', () => {
    expect(checkVerifyLock(null, NOW)).toEqual({ locked: false });
  });

  it('not locked once lockedUntil has passed', () => {
    const past = new Date(NOW.getTime() - 1000);
    expect(checkVerifyLock(past, NOW)).toEqual({ locked: false });
  });

  it('locked with the remaining seconds while lockedUntil is in the future', () => {
    const future = new Date(NOW.getTime() + 90_000);
    const result = checkVerifyLock(future, NOW);
    expect(result).toEqual({ locked: true, retryAfterSeconds: 90 });
  });
});

describe('nextVerifyLockState', () => {
  it('increments attempts without locking below the cap', () => {
    const result = nextVerifyLockState(0, NOW);
    expect(result.attempts).toBe(1);
    expect(result.lockedUntil).toBeNull();
  });

  it('stays unlocked just under the cap', () => {
    const result = nextVerifyLockState(MAX_VERIFY_ATTEMPTS - 2, NOW);
    expect(result.attempts).toBe(MAX_VERIFY_ATTEMPTS - 1);
    expect(result.lockedUntil).toBeNull();
  });

  it('locks for VERIFY_LOCKOUT_MS once attempts reach the cap', () => {
    const result = nextVerifyLockState(MAX_VERIFY_ATTEMPTS - 1, NOW);
    expect(result.attempts).toBe(MAX_VERIFY_ATTEMPTS);
    expect(result.lockedUntil).toEqual(new Date(NOW.getTime() + VERIFY_LOCKOUT_MS));
  });

  it('keeps locking (extends) past the cap', () => {
    const result = nextVerifyLockState(MAX_VERIFY_ATTEMPTS + 3, NOW);
    expect(result.attempts).toBe(MAX_VERIFY_ATTEMPTS + 4);
    expect(result.lockedUntil).toEqual(new Date(NOW.getTime() + VERIFY_LOCKOUT_MS));
  });
});
