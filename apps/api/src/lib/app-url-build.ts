import { resolveBotLocale } from './telegram-i18n.js';

// Pure part of lib/app-url.ts, split out so it can be unit-tested without
// loading env.ts (which exits the process when DATABASE_URL etc. are unset).
//
// Always returns `<base>/<locale><path>`: every page of the web app lives
// under a locale segment, and the app host has no route that works without
// one. Unknown/missing locale falls back to 'ru', same as the rest of the API.
export function buildAppUrl(base: string, path: string, locale?: string | null): string {
  const loc = resolveBotLocale(undefined, locale);
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/+$/, '')}/${loc}${p}`;
}
