import Constants from 'expo-constants';

/**
 * AppMetrica — native-shell analytics. Structural events only: which of the
 * app's 5 native screens is showing (splash/onboarding/login/biometric/main)
 * and a handful of fixed-name lifecycle events. Never a value read from a
 * form field, a message, or anything typed by the patient.
 *
 * This is deliberately separate from the web-side Yandex Metrika instance
 * (apps/aivita/lib/analytics/metrika.ts): that one tracks the pages INSIDE
 * the WebView (the same aivita.uz screens a browser visitor sees); this one
 * tracks the native wrapper around it — the two native screens that exist
 * outside any WebView (splash, onboarding, biometric lock) would otherwise
 * report nothing at all.
 *
 * NOT verified on-device — this environment has no emulator or connected
 * device to run a native build against. Requires `npm install` and a native
 * rebuild (expo prebuild / eas build) before this can actually report
 * anything; until then every call below is a safe no-op (see isReady()).
 */

// Lazily required so a missing/un-built native module can't crash app
// startup — every exported function checks isReady() first regardless.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AppMetrica: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppMetrica = require('@appmetrica/react-native-analytics').default;
} catch {
  // package not installed / native module not linked yet — analytics.ts
  // still loads, every call below just becomes a no-op
}

const API_KEY = Constants.expoConfig?.extra?.appMetricaApiKey as string | undefined;

let activated = false;

function isReady(): boolean {
  return !!AppMetrica && !!API_KEY && activated;
}

/** Call once at app start (App.tsx), before any tracking call. No-ops
 * silently when the package isn't installed/linked yet or no API key is
 * configured — same "absent config, safe no-op" pattern used throughout
 * this codebase for other optional integrations. */
export function initAnalytics(): void {
  if (!AppMetrica || !API_KEY || activated) return;
  try {
    AppMetrica.activate({
      apiKey: API_KEY,
      sessionTimeout: 120,
      logs: false,
    });
    activated = true;
  } catch {
    // analytics must never crash the app
  }
}

function reportEvent(name: string, attributes?: Record<string, unknown>): void {
  if (!isReady()) return;
  try {
    AppMetrica.reportEvent(name, attributes);
  } catch {
    // analytics must never crash the app
  }
}

/** One of the app's 5 native screens (see App.tsx's Screen type) — never a
 * WebView-internal route, those are Yandex Metrika's job on the web side. */
export function trackScreenView(screen: string): void {
  reportEvent('screen_view', { screen });
}

/** A named feature was used to completion. `feature` must be a short fixed
 * identifier, never a value derived from user input. */
export function trackFeatureUsed(feature: string): void {
  reportEvent('feature_used', { feature });
}

/** Sign-in or sign-up completed. `method` is a fixed enum, never anything
 * derived from the credentials themselves. */
export function trackAuthSuccess(method: string): void {
  reportEvent('auth_success', { method });
}

/** The subscription plans / upgrade screen was viewed. */
export function trackPlanUpgradeView(plan?: string): void {
  reportEvent('plan_upgrade_view', plan ? { plan } : undefined);
}
