import { redis } from './redis.js';

/**
 * Cache idempotent AI results in Redis to avoid repeat model calls for identical
 * inputs. Safe by design: any Redis failure falls back to computing directly, and
 * null results are never cached. Use only for deterministic-enough endpoints
 * (e.g. text advice keyed by its inputs) — never for per-photo or streaming calls.
 */
export async function cachedAI<T>(
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T | null>,
): Promise<T | null> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    // Redis miss/unavailable → compute directly.
  }

  const value = await produce();

  if (value != null) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Caching is best-effort.
    }
  }
  return value;
}
