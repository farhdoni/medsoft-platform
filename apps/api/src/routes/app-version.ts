import { Hono } from 'hono';
import { env } from '../env.js';

// Public, unauthenticated (queried before login) — lets an already-installed
// mobile-patient/mobile-doctor build ask "is there something newer" and show
// a soft, dismissible banner (variant A: no forced update, see minVersionCode
// below). To publish a new release, bump APP_LATEST_VERSION_CODE/NAME in the
// API's env to match the new build's versionCode/versionName and restart —
// no client release needed to change the number being announced.
//
// minVersionCode stays 0 today: the client only reads it, it never gates
// anything on it yet. Raising it above 0 later (once a blocking-update
// screen exists on the client) starts enforcing a forced update without a
// new client release.
export const appVersionRouter = new Hono();

appVersionRouter.get('/', (c) => {
  c.header('Cache-Control', 'public, max-age=300');
  return c.json({
    latestVersionCode: env.APP_LATEST_VERSION_CODE,
    latestVersionName: env.APP_LATEST_VERSION_NAME,
    downloadUrl: env.APP_DOWNLOAD_URL,
    minVersionCode: env.APP_MIN_VERSION_CODE,
  });
});
