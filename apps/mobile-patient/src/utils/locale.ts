export type AppLanguage = 'ru' | 'uz' | 'en';

// The native shell has no i18n system of its own (all real UI text lives in
// the WebView-loaded web app). For the handful of native-only strings (this
// update banner), detect the OS locale via Intl — no extra native
// dependency needed, Hermes ships Intl by default on this Expo SDK/RN
// version. 'ru' matches the web app's own DEFAULT_LOCALE (apps/aivita/middleware.ts).
export function getDeviceLanguage(): AppLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (locale.startsWith('uz')) return 'uz';
    if (locale.startsWith('en')) return 'en';
  } catch {
    // Intl unavailable for some reason — fall through to the default below
  }
  return 'ru';
}
