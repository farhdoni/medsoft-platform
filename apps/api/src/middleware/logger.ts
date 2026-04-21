import pino from 'pino';
import { env } from '../env';
import type { MiddlewareHandler } from 'hono';

export const logger = pino({
  level: 'info',
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  redact: ['req.headers.authorization', 'password', 'token', 'secret', 'code'],
});

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info({ method: c.req.method, path: c.req.path, status: c.res.status, ms });
};
