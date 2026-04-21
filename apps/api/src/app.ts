import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { patientsRouter } from './routes/patients';
import { doctorsRouter } from './routes/doctors';
import { clinicsRouter } from './routes/clinics';
import { appointmentsRouter } from './routes/appointments';
import { transactionsRouter } from './routes/transactions';
import { sosCallsRouter } from './routes/sos-calls';
import { aiLogsRouter } from './routes/ai-logs';
import { adminsRouter } from './routes/admins';
import { dashboardRouter } from './routes/dashboard';

export const app = new Hono();

const origins = env.CORS_ORIGIN.split(',').map(s => s.trim());
app.use('*', cors({ origin: origins, credentials: true }));
app.use('*', loggerMiddleware);
app.onError(errorHandler);

app.route('/v1/health', healthRouter);
app.route('/v1/auth', authRouter);
app.route('/v1/patients', patientsRouter);
app.route('/v1/doctors', doctorsRouter);
app.route('/v1/clinics', clinicsRouter);
app.route('/v1/appointments', appointmentsRouter);
app.route('/v1/transactions', transactionsRouter);
app.route('/v1/sos-calls', sosCallsRouter);
app.route('/v1/ai-logs', aiLogsRouter);
app.route('/v1/admins', adminsRouter);
app.route('/v1/dashboard', dashboardRouter);
