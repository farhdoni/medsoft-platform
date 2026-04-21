import type { ErrorHandler } from 'hono';
import { logger } from './logger';

export const errorHandler: ErrorHandler = (err, c) => {
  logger.error({ err: err.message }, 'Unhandled error');
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
};
