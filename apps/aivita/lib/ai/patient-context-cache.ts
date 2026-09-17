/**
 * In-memory LRU cache for buildPatientContext, keyed by aivita userId.
 *
 * apps/aivita has no Redis client or REDIS_URL wired up anywhere (checked —
 * zero references in the app), so this is process-local rather than
 * Redis-backed. That's exactly right for the current deployment: aivita
 * runs as a single container behind app.aivita.uz (confirmed via Coolify),
 * so a process-local cache is 100% effective today. LIMITATION, stated
 * honestly: if this app is ever horizontally scaled to multiple replicas,
 * a cache hit in one instance is invisible to a request landing on
 * another — hit rate would drop roughly in proportion to the replica
 * count. It would still be a pure win over always fetching, just a smaller
 * one; moving this to Redis at that point is a small, contained change
 * (same get/set/invalidate shape) since nothing outside this file knows
 * the cache is in-memory.
 *
 * Invalidation: NONE on writes (see the task's own report — /survey/answer
 * and profile/medication/vitals writes all happen in apps/api, a separate
 * process, with no existing mechanism for apps/api to reach into this
 * process's memory or call back into aivita; building one is out of scope
 * for this task). The 5-minute TTL is the sole staleness bound, accepted
 * per the task's own explicit fallback ("иначе принять 5-минутную
 * задержку").
 */

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedPatientContext(userId: string, now: number = Date.now()): string | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (now > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  // Touch for LRU recency: delete + re-insert moves it to the end of
  // Map's iteration order, which _evictOldestIfFull reads from the front.
  cache.delete(userId);
  cache.set(userId, entry);
  return entry.value;
}

export function setCachedPatientContext(userId: string, value: string, now: number = Date.now()): void {
  if (!cache.has(userId) && cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(userId, { value, expiresAt: now + TTL_MS });
}

export function invalidatePatientContext(userId: string): void {
  cache.delete(userId);
}

/** Test-only: reset all state between test cases. */
export function _clearPatientContextCacheForTests(): void {
  cache.clear();
}

/** Test-only: current entry count, to assert the size bound. */
export function _cacheSizeForTests(): number {
  return cache.size;
}
