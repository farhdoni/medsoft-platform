import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app';
import { env } from './env';
import { logger } from './middleware/logger';

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  logger.info(`API running on http://localhost:${info.port}`);
});
