import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { env } from './env.js';
import { initJwt } from './lib/jwt.js';
import { redis } from './lib/redis.js';
import { logger } from './lib/logger.js';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import { auth } from './routes/auth.js';
import { patientsRouter } from './routes/patients.js';
import { doctorsRouter } from './routes/doctors.js';
import { clinicsRouter } from './routes/clinics.js';
import { appointmentsRouter } from './routes/appointments.js';
import { transactionsRouter } from './routes/transactions.js';
import { sosCallsRouter } from './routes/sos-calls.js';
import { adminsRouter } from './routes/admins.js';
import { dashboardRouter } from './routes/dashboard.js';
// Aivita routes
import { aivitaAuthRouter } from './routes/aivita/auth.js';
import { aivitaUsersRouter } from './routes/aivita/users.js';
import { aivitaHealthProfileRouter } from './routes/aivita/health-profile.js';
import { aivitaHealthScoreRouter } from './routes/aivita/health-score.js';
import { aivitaHabitsRouter } from './routes/aivita/habits.js';
import { aivitaNutritionRouter } from './routes/aivita/nutrition.js';
import { aivitaChatRouter } from './routes/aivita/chat.js';
import { aivitaFamilyRouter } from './routes/aivita/family.js';
import { aivitaNotificationsRouter } from './routes/aivita/notifications.js';
import { aivitaReportsRouter } from './routes/aivita/reports.js';

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
// Aivita
app.route('/v1/aivita/auth', aivitaAuthRouter);
app.route('/v1/aivita/users', aivitaUsersRouter);
app.route('/v1/aivita/health-profile', aivitaHealthProfileRouter);
app.route('/v1/aivita/health-score', aivitaHealthScoreRouter);
app.route('/v1/aivita/habits', aivitaHabitsRouter);
app.route('/v1/aivita/nutrition', aivitaNutritionRouter);
app.route('/v1/aivita/chat', aivitaChatRouter);
app.route('/v1/aivita/family', aivitaFamilyRouter);
app.route('/v1/aivita/notifications', aivitaNotificationsRouter);
app.route('/v1/aivita/reports', aivitaReportsRouter);

app.onError((err, c) => {
  logger.error({ err }, 'Unhandled error');
  return c.json({ error: 'Internal server error' }, 500);
});

async function runMigrationsAndSeed() {
  const client = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 10 });
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    // Docker layout: /app/apps/api/src/index.ts → /app/packages/db/migrations
    const migrationsFolder = path.resolve(__dirname, '../../../packages/db/migrations');
    logger.info({ migrationsFolder }, 'Running DB migrations');

    // Read SQL files from migrations folder and execute each one
    const fs = await import('fs');
    const migrationsExist = fs.existsSync(migrationsFolder);
    if (!migrationsExist) {
      logger.warn('Migrations folder not found, skipping.');
    } else {
      const sqlFiles = fs.readdirSync(migrationsFolder)
        .filter((f: string) => f.endsWith('.sql'))
        .sort();
      for (const file of sqlFiles) {
        const sql = fs.readFileSync(path.join(migrationsFolder, file), 'utf-8');
        // Split on drizzle statement-breakpoint marker and execute each statement
        const statements = sql.split('--> statement-breakpoint').map((s: string) => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          await client.unsafe(stmt);
        }
      }
      logger.info({ count: sqlFiles.length }, 'Migrations applied.');
    }

    // Seed superadmin (idempotent)
    const { db: appDb, adminUsers } = await import('@medsoft/db');
    const email = env.SEED_SUPERADMIN_EMAIL ?? 'farhodni@gmail.com';
    await appDb.insert(adminUsers).values({
      email,
      fullName: 'Super Admin',
      role: 'superadmin',
      isActive: true,
    }).onConflictDoNothing();
    logger.info({ email }, 'Superadmin ensured.');
  } catch (err) {
    logger.error({ err }, 'Migration/seed error — continuing anyway');
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  await initJwt();
  await runMigrationsAndSeed();

  // Connect to Redis - non-fatal: server still starts if Redis is temporarily unavailable
  redis.connect().catch((err) => {
    logger.warn({ err }, 'Redis initial connect failed — will retry automatically');
  });

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info(`Server running on port ${info.port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
