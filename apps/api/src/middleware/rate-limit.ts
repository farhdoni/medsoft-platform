import { createMiddleware } from 'hono/factory';
import { redis } from '../lib/redis.js';

export function rateLimit(key: string, max: number, windowSeconds: number) {
  return createMiddleware(async (c, next) => {
    try {
      const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
      const redisKey = `rl:${key}:${ip}`;
      const count = await redis.incr(redisKey);
      if (count === 1) await redis.expire(redisKey, windowSeconds);
      if (count > max) {
        return c.json({ error: 'Too many requests' }, 429);
      }
    } catch {
      // Redis unavailable — fail open (allow request through)
    }
    await next();
  });
}
