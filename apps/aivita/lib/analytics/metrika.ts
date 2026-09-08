/**
 * Yandex Metrika helpers — structural events only.
 *
 * Hard rule for everything in this file: parameters are screen names, feature
 * identifiers and short enums — never diagnoses, names, prescriptions, chat
 * text or search phrases. Nothing here should ever receive a value read from
 * a form field, a message body, or free user input.
 */

declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void;
  }
}

// ─── Screen name resolution ─────────────────────────────────────────────────

/** First-path-segment → human label. Kept in sync with the real route tree
 * under apps/aivita/app/[locale] (checked against `next build`'s route list,
 * not guessed) — a segment missing here still gets a readable label via the
 * humanize() fallback below, so a new route never silently stops reporting. */
const SCREEN_LABELS: Record<string, string> = {
  '': 'Landing',
  home: 'Home',
  'ai-checkup': 'AI Checkup',
  'ai-chat': 'AI Chat',
  'medical-card': 'Medical Card',
  'medical-history': 'Medical History',
  vitals: 'Vitals',
  habits: 'Habits',
  medications: 'Medications',
  'drug-checker': 'Drug Checker',
  family: 'Family',
  gadgets: 'Gadgets',
  messenger: 'Messenger',
  notifications: 'Notifications',
  nutrition: 'Nutrition',
  pricing: 'Pricing',
  profile: 'Profile',
  settings: 'Settings',
  'symptom-checker': 'Symptom Checker',
  'mental-health': 'Mental Health',
  'health-agents': 'Health Agents',
  'health-analysis': 'Health Analysis',
  report: 'Report',
  install: 'Install',
  'coming-soon': 'Coming Soon',
  'get-app': 'Get App',
  offline: 'Offline',
  'sign-in': 'Sign In',
  'sign-up': 'Sign Up',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  'verify-email': 'Verify Email',
  terms: 'Terms',
  privacy: 'Privacy',
  onboarding: 'Onboarding',
  doctors: 'Doctors Catalog',
  pharmacy: 'Pharmacy',
  test: 'Test',
  card: 'Digital Card',
  chat: 'Chat', // legacy /chat/[id] deep link — now redirects into Messenger
  'video-call': 'Video Call',
  // Doctor cabinet — same app, different role
  'doctor-home': 'Doctor Home',
  'doctor-ai': 'Doctor AI',
  'doctor-appointments': 'Doctor Appointments',
  'doctor-chats': 'Doctor Chats',
  'doctor-drug-checker': 'Doctor Drug Checker',
  'doctor-patients': 'Doctor Patients',
  'doctor-patient': 'Doctor Patient',
  'doctor-prescriptions': 'Doctor Prescriptions',
  'doctor-profile': 'Doctor Profile',
  'doctor-schedule': 'Doctor Schedule',
  'doctor-scribe': 'Doctor Scribe',
  'doctor-settings': 'Doctor Settings',
  'doctor-login': 'Doctor Login',
  'doctor-sign-up': 'Doctor Sign Up',
  'doctor-video-call': 'Doctor Video Call',
};

/** Second-path-segment words known to be static (not an id/UUID/code). Only
 * segments in this allowlist are ever appended to the screen name — anything
 * else (a conversation id, a doctor id, a test system id, a family-member id,
 * a digital-card code, a video-call room id…) collapses to "Detail" instead,
 * so an identifier can never end up in an analytics event. */
const KNOWN_SUBPATHS = new Set([
  'orders', 'search', 'archives', 'start', 'settings', 'notifications',
  'payment-methods', 'referral', 'subscription', 'age', 'anamnesis',
  'lifestyle', 'result', 'welcome', 'results', 'earnings', 'navigation',
  'partnership', 'payout', 'child', 'success',
]);

function humanize(segment: string): string {
  return segment
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Path → safe screen name, with every dynamic id segment stripped before it
 * ever reaches Metrika. `/ru/messenger/3f9a2e01-...` becomes
 * "Messenger · Detail", never the raw conversation id.
 */
export function resolveScreenName(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/(ru|uz|en)(?=\/|$)/, '');
  const segments = withoutLocale.split('/').filter(Boolean);

  if (segments.length === 0) return SCREEN_LABELS[''];

  const base = SCREEN_LABELS[segments[0]] ?? humanize(segments[0]);
  if (segments.length === 1) return base;

  const second = segments[1];
  const subLabel = KNOWN_SUBPATHS.has(second) ? humanize(second) : 'Detail';
  return `${base} · ${subLabel}`;
}

// ─── Event helpers ───────────────────────────────────────────────────────────

function ym(counterId: number, action: string, ...args: unknown[]): void {
  try {
    if (typeof window !== 'undefined' && typeof window.ym === 'function') {
      window.ym(counterId, action, ...args);
    }
  } catch {
    // analytics must never crash the app
  }
}

let activeCounterId: number | null = null;

/** Called once by <AivitaMetrika> after the counter script loads. */
export function setActiveCounter(counterId: number | null): void {
  activeCounterId = counterId;
}

/** SPA route change — Metrika's own script only fires a hit on the initial
 * full page load, so every client-side navigation needs an explicit one. */
export function trackHit(pathname: string): void {
  if (activeCounterId === null) return;
  const sanitizedPath = sanitizePathForHit(pathname);
  ym(activeCounterId, 'hit', sanitizedPath);
}

/** Same id-stripping as resolveScreenName, applied to the URL Metrika logs
 * for its own pageview report — a resource id in a URL isn't diagnosis/name/
 * message content, but it can still point at one specific patient's specific
 * conversation or medication, so it gets the same treatment as a precaution. */
function sanitizePathForHit(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/(ru|uz|en)(?=\/|$)/, '');
  const segments = withoutLocale.split('/').filter(Boolean);
  if (segments.length < 2) return pathname;
  const sanitized = segments.map((seg, i) => (i === 0 || KNOWN_SUBPATHS.has(seg) ? seg : ':id'));
  const locale = pathname.match(/^\/(ru|uz|en)(?=\/|$)/)?.[1];
  return `/${locale ? locale + '/' : ''}${sanitized.join('/')}`;
}

/** Structural: which screen was viewed. Fired automatically by
 * <AivitaMetrika> on every route change — most callers never need this. */
export function trackScreenView(screen: string): void {
  if (activeCounterId === null) return;
  ym(activeCounterId, 'reachGoal', 'screen_view', { screen });
}

/** A named feature was used to completion (e.g. "symptom_checker_completed").
 * `feature` must be a short fixed identifier, never a value derived from
 * user input. */
export function trackFeatureUsed(feature: string): void {
  if (activeCounterId === null) return;
  ym(activeCounterId, 'reachGoal', 'feature_used', { feature });
}

/** Sign-in or sign-up completed. `method` is a fixed enum ('sign_up',
 * 'sign_in', 'biometric', …), never anything derived from the credentials. */
export function trackAuthSuccess(method: string): void {
  if (activeCounterId === null) return;
  ym(activeCounterId, 'reachGoal', 'auth_success', { method });
}

/** The subscription plans / upgrade screen was viewed. */
export function trackPlanUpgradeView(plan?: string): void {
  if (activeCounterId === null) return;
  ym(activeCounterId, 'reachGoal', 'plan_upgrade_view', plan ? { plan } : undefined);
}
