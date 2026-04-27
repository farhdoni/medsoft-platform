import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { env } from './env.js';
import { initJwt } from './lib/jwt.js';
import { redis } from './lib/redis.js';
import { logger } from './lib/logger.js';
import { auth } from './routes/auth.js';
import { patientsRouter } from './routes/patients.js';
import { doctorsRouter } from './routes/doctors.js';
import { clinicsRouter } from './routes/clinics.js';
import { appointmentsRouter } from './routes/appointments.js';
import { transactionsRouter } from './routes/transactions.js';
import { sosCallsRouter } from './routes/sos-calls.js';
import { adminsRouter } from './routes/admins.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = new Hono();

app.use('*', cors({
  origin: env.CORS_ORIGINS.split(','),
  credentials: true,
}));

app.use('*', honoLogger());

app.get('/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.route('/v1/auth', auth);
app.route('/v1/patients', patientsRouter);
app.route('/v1/doctors', doctorsRouter);
app.route('/v1/clinics', clinicsRouter);
app.route('/v1/appointments', appointmentsRouter);
app.route('/v1/transactions', transactionsRouter);
app.route('/v1/sos-calls', sosCallsRouter);
app.route('/v1/admins', adminsRouter);
app.route('/v1/dashboard', dashboardRouter);

app.onError((err, c) => {
  logger.error({ err }, 'Unhandled error');
  return c.json({ error: 'Internal server error' }, 500);
});

async function main() {
  await initJwt();
  await redis.connect();

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info(`Server running on port ${info.port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
