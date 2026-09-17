import { describe, expect, it, beforeEach } from 'vitest';
import {
  getCachedPatientContext,
  setCachedPatientContext,
  invalidatePatientContext,
  _clearPatientContextCacheForTests,
  _cacheSizeForTests,
} from '../patient-context-cache';

const FIVE_MIN_MS = 5 * 60 * 1000;

describe('patient-context-cache', () => {
  beforeEach(() => {
    _clearPatientContextCacheForTests();
  });

  it('returns null on a cache miss', () => {
    expect(getCachedPatientContext('user-1')).toBeNull();
  });

  it('returns the cached value on a hit', () => {
    setCachedPatientContext('user-1', 'summary for user 1');
    expect(getCachedPatientContext('user-1')).toBe('summary for user 1');
  });

  it('expires after 5 minutes', () => {
    const t0 = 1_000_000;
    setCachedPatientContext('user-1', 'summary', t0);
    expect(getCachedPatientContext('user-1', t0 + FIVE_MIN_MS - 1)).toBe('summary');
    expect(getCachedPatientContext('user-1', t0 + FIVE_MIN_MS + 1)).toBeNull();
  });

  it('isolates entries per user', () => {
    setCachedPatientContext('user-1', 'summary for user 1');
    setCachedPatientContext('user-2', 'summary for user 2');
    expect(getCachedPatientContext('user-1')).toBe('summary for user 1');
    expect(getCachedPatientContext('user-2')).toBe('summary for user 2');
    expect(getCachedPatientContext('user-3')).toBeNull();
  });

  it('invalidatePatientContext removes only that user', () => {
    setCachedPatientContext('user-1', 'summary for user 1');
    setCachedPatientContext('user-2', 'summary for user 2');
    invalidatePatientContext('user-1');
    expect(getCachedPatientContext('user-1')).toBeNull();
    expect(getCachedPatientContext('user-2')).toBe('summary for user 2');
  });

  it('a read past expiry removes the stale entry (does not linger)', () => {
    const t0 = 0;
    setCachedPatientContext('user-1', 'summary', t0);
    getCachedPatientContext('user-1', t0 + FIVE_MIN_MS + 1); // triggers eviction
    expect(_cacheSizeForTests()).toBe(0);
  });

  it('overwriting an existing user does not grow the cache', () => {
    setCachedPatientContext('user-1', 'first');
    setCachedPatientContext('user-1', 'second');
    expect(_cacheSizeForTests()).toBe(1);
    expect(getCachedPatientContext('user-1')).toBe('second');
  });

  it('bounds memory: evicts the oldest entry once MAX_ENTRIES is exceeded', () => {
    const MAX_ENTRIES = 500;
    for (let i = 0; i < MAX_ENTRIES; i++) {
      setCachedPatientContext(`user-${i}`, `summary ${i}`);
    }
    expect(_cacheSizeForTests()).toBe(MAX_ENTRIES);

    // The very first user inserted should be evicted to make room.
    setCachedPatientContext('user-new', 'summary new');
    expect(_cacheSizeForTests()).toBe(MAX_ENTRIES);
    expect(getCachedPatientContext('user-0')).toBeNull();
    expect(getCachedPatientContext('user-new')).toBe('summary new');
  });
});
