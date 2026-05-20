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
import { aivitaAdminRouter } from './routes/aivita-admin.js';
import { aivitaUsersRouter } from './routes/aivita/users.js';
import { aivitaHealthProfileRouter } from './routes/aivita/health-profile.js';
import { aivitaHealthScoreRouter } from './routes/aivita/health-score.js';
import { aivitaHabitsRouter } from './routes/aivita/habits.js';
import { aivitaNutritionRouter } from './routes/aivita/nutrition.js';
import { aivitaChatRouter } from './routes/aivita/chat.js';
import { aivitaFamilyRouter } from './routes/aivita/family.js';
import { aivitaNotificationsRouter } from './routes/aivita/notifications.js';
import { aivitaReportsRouter } from './routes/aivita/reports.js';
import { aivitaDeviceTokensRouter } from './routes/aivita/device-tokens.js';
import { aivitaVitalsRouter } from './routes/aivita/vitals.js';
import { aivitaUserDevicesRouter } from './routes/aivita/user-devices.js';
// Aivita Doctor routes
import { doctorProfileRouter } from './routes/aivita/doctor/profile.js';
import { doctorPatientsRouter } from './routes/aivita/doctor/patients.js';
import { doctorScheduleRouter } from './routes/aivita/doctor/schedule.js';
import { doctorAppointmentsRouter } from './routes/aivita/doctor/appointments.js';
import { doctorPrescriptionsRouter } from './routes/aivita/doctor/prescriptions.js';
import { doctorTemplatesRouter } from './routes/aivita/doctor/templates.js';
import { doctorNotesRouter } from './routes/aivita/doctor/notes.js';
import { doctorNotificationsRouter } from './routes/aivita/doctor/notifications.js';
import { doctorLikesRouter } from './routes/aivita/doctor/likes.js';
import { doctorReviewsRouter } from './routes/aivita/doctor/reviews.js';
import { doctorReferralsRouter } from './routes/aivita/doctor/referrals.js';
import { doctorStatsRouter } from './routes/aivita/doctor/stats.js';
import { doctorCatalogRouter } from './routes/aivita/doctor/catalog.js';
import { sosRouter } from './routes/aivita/sos.js';
import cardRouter from './routes/aivita/card.js';
import { aivitaMedicationsRouter } from './routes/aivita/medications.js';
import { aivitaOnboardingRouter } from './routes/aivita/onboarding.js';
import { aivitaCheckupRouter } from './routes/aivita/checkup.js';
import { outbreakRouter, symptomsRouter } from './routes/aivita/outbreak.js';
import { conversationsRouter } from './routes/aivita/conversations.js';
import { uploadRouter, uploadsServeRouter } from './routes/aivita/upload.js';
import { startPushReminders } from './jobs/push-reminders.js';
import { startSubscriptionRenewal } from './jobs/subscription-renewal.js';
import { startNotificationReminders } from './jobs/notification-reminders.js';
import { clickRouter } from './routes/payments/click.js';
import { paymeRouter } from './routes/payments/payme.js';
import { uzumRouter } from './routes/payments/uzum.js';
import { aivitaPaymentsRouter, aivitaPaymentMethodsRouter, aivitaPromoRouter } from './routes/aivita/payments.js';
import { doctorEarningsRouter } from './routes/aivita/doctor/earnings.js';
import { doctorDashboardStatsRouter } from './routes/aivita/doctor/dashboard-stats.js';
import { adminFinanceRouter } from './routes/admin/finance.js';
import { platformSettingsRouter } from './routes/admin/platform-settings.js';
import { adminPayoutsRouter } from './routes/admin/payouts.js';
import { adminNotificationsRouter } from './routes/admin/notifications.js';
import { adminMonitoringRouter } from './routes/admin-monitoring.js';
import { landingPublicRouter, landingAdminRouter } from './routes/landing-content.js';
import { landingApiRouter } from './routes/landing-api.js';
import { adminPharmaciesRouter } from './routes/admin-pharmacies.js';
import { pharmacyRouter } from './routes/pharmacy.js';
import { aivitaPharmacyRouter } from './routes/aivita/pharmacy.js';
import { medicalRouter } from './routes/aivita/medical.js';
import { aivitaReferralRouter } from './routes/aivita/referral.js';

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
// Monitoring (admin-only)
app.route('/v1/admin/monitoring', adminMonitoringRouter);
// Landing public API (aivita.uz/api/*)
app.route('/api', landingApiRouter);
// Landing CMS — public read + admin write
app.route('/v1/landing', landingPublicRouter);
app.route('/v1/aivita-admin/cms', landingAdminRouter);
// Aivita
app.route('/v1/aivita/auth', aivitaAuthRouter);
app.route('/v1/aivita/onboarding', aivitaOnboardingRouter);
app.route('/v1/aivita-admin', aivitaAdminRouter);
app.route('/v1/aivita/users', aivitaUsersRouter);
app.route('/v1/aivita/health-profile', aivitaHealthProfileRouter);
app.route('/v1/aivita/health-score', aivitaHealthScoreRouter);
app.route('/v1/aivita/habits', aivitaHabitsRouter);
app.route('/v1/aivita/nutrition', aivitaNutritionRouter);
app.route('/v1/aivita/chat', aivitaChatRouter);
app.route('/v1/aivita/family', aivitaFamilyRouter);
app.route('/v1/aivita/notifications', aivitaNotificationsRouter);
app.route('/v1/aivita/reports', aivitaReportsRouter);
app.route('/v1/aivita/device-tokens', aivitaDeviceTokensRouter);
app.route('/v1/aivita/vitals', aivitaVitalsRouter);
app.route('/v1/aivita/devices', aivitaUserDevicesRouter);
// Aivita Doctor Cabinet
app.route('/v1/aivita/doctor/profile', doctorProfileRouter);
app.route('/v1/aivita/doctor/patients', doctorPatientsRouter);
app.route('/v1/aivita/doctor/schedule', doctorScheduleRouter);
app.route('/v1/aivita/doctor/appointments', doctorAppointmentsRouter);
app.route('/v1/aivita/doctor/prescriptions', doctorPrescriptionsRouter);
app.route('/v1/aivita/doctor/templates', doctorTemplatesRouter);
app.route('/v1/aivita/doctor/notes', doctorNotesRouter);
app.route('/v1/aivita/doctor/notifications', doctorNotificationsRouter);
app.route('/v1/aivita/doctor/likes', doctorLikesRouter);
app.route('/v1/aivita/doctor/reviews', doctorReviewsRouter);
app.route('/v1/aivita/doctor/referrals', doctorReferralsRouter);
app.route('/v1/aivita/doctor/stats', doctorStatsRouter);
app.route('/v1/aivita/catalog', doctorCatalogRouter);
app.route('/v1/aivita/sos', sosRouter);
app.route('/v1/aivita/card', cardRouter);
app.route('/v1/aivita/medications', aivitaMedicationsRouter);
app.route('/v1/aivita/checkup', aivitaCheckupRouter);
app.route('/v1/aivita/outbreak', outbreakRouter);
app.route('/v1/aivita/symptoms', symptomsRouter);
app.route('/v1/aivita/conversations', conversationsRouter);
app.route('/v1/aivita/upload', uploadRouter);
app.route('/v1/aivita/uploads', uploadsServeRouter);
// Pharmacy partner system
app.route('/v1/admin/pharmacies', adminPharmaciesRouter);
app.route('/v1/pharmacy', pharmacyRouter);
app.route('/v1/aivita/pharmacy', aivitaPharmacyRouter);
app.route('/v1/aivita/medical', medicalRouter);
app.route('/v1/aivita/referral', aivitaReferralRouter);
// Payment gateways (webhooks + card binding)
app.route('/v1/payments/click', clickRouter);
app.route('/v1/payments/payme', paymeRouter);
app.route('/v1/payments/uzum', uzumRouter);
// Aivita payments & subscriptions
app.route('/v1/aivita/payments', aivitaPaymentsRouter);
app.route('/v1/aivita/payment-methods', aivitaPaymentMethodsRouter);
app.route('/v1/aivita/promo', aivitaPromoRouter);
// Doctor earnings
app.route('/v1/aivita/doctor/earnings', doctorEarningsRouter);
app.route('/v1/aivita/doctor/dashboard-stats', doctorDashboardStatsRouter);
// Admin finance
app.route('/v1/admin/finance', adminFinanceRouter);
app.route('/v1/admin/payouts', adminPayoutsRouter);
app.route('/v1/admin/settings/platform', platformSettingsRouter);
app.route('/v1/admin/notifications', adminNotificationsRouter);

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

    // Seed superadmin (idempotent — only creates if email doesn't exist yet)
    // Password must be set separately via SEED_SUPERADMIN_PASSWORD env var
    // or via the Coolify Terminal after first deploy.
    const { db: appDb, adminUsers } = await import('@medsoft/db');
    const { default: bcryptSeed } = await import('bcryptjs');
    const email = env.SEED_SUPERADMIN_EMAIL ?? 'farhodni@gmail.com';
    const rawPassword = env.SEED_SUPERADMIN_PASSWORD;
    const passwordHash = rawPassword
      ? await bcryptSeed.hash(rawPassword, 12)
      : null;

    await appDb.insert(adminUsers).values({
      email,
      fullName: 'Farhod (Founder)',
      role: 'superadmin',
      isActive: true,
      ...(passwordHash ? { passwordHash } : {}),
    }).onConflictDoUpdate({
      target: adminUsers.email,
      set: {
        role: 'superadmin',
        isActive: true,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
    logger.info({ email, hasPassword: !!passwordHash }, 'Superadmin ensured.');
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

  startPushReminders();
  startSubscriptionRenewal();
  startNotificationReminders();
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
