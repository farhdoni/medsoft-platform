import Redis from 'ioredis';
import { env } from '../env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 0,  // fail fast — callers handle errors
  connectTimeout: 2000,
  commandTimeout: 2000,
});

redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('connect', () => logger.info('Redis connected'));
