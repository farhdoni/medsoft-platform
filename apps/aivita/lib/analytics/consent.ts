/**
 * Согласие на аналитические cookie — общее с лендингом aivita.uz
 * (apps/landing/assets/analytics.js): cookie `aivita_consent` на .aivita.uz,
 * значения granted | denied, срок год. Ответил на лендинге — приложение уже
 * знает ответ, и наоборот.
 */
export type Consent = 'granted' | 'denied';

const COOKIE = 'aivita_consent';
const ONE_YEAR = 365 * 24 * 60 * 60;
export const CONSENT_EVENT = 'aivita-consent-change';

export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)aivita_consent=(granted|denied)/);
  return (m?.[1] as Consent | undefined) ?? null;
}

export function writeConsent(value: Consent): void {
  const onAivita = /(^|\.)aivita\.uz$/.test(location.hostname);
  const domain = onAivita ? '; domain=.aivita.uz' : '';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${value}; max-age=${ONE_YEAR}; path=/${domain}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}
