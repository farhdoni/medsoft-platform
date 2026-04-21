import type { MiddlewareHandler } from 'hono';
import { redis } from '../lib/redis';

export const rateLimit = (maxReqs: number, windowSec: number, keyPrefix: string): MiddlewareHandler => async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const key = `rl:${keyPrefix}:${ip}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSec);
  if (current > maxReqs) {
    return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
  }
  await next();
};
