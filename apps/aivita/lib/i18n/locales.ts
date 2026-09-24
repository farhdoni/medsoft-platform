// Single source of truth for the three app locales — flag, native name, cookie
// and path helpers. Every language switcher in the app (sign-in, sign-up,
// TopBar, Settings) reads from here instead of hand-rolling its own copy, so
// flags/names/cookie attributes can't drift out of sync between screens again.

export type LocaleCode = 'ru' | 'uz' | 'en';

export const LOCALES: ReadonlyArray<{ code: LocaleCode; flag: string; name: string }> = [
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'uz', flag: '🇺🇿', name: "O'zbek" },
  { code: 'en', flag: '🇬🇧', name: 'English' },
];

export const DEFAULT_LOCALE: LocaleCode = 'ru';

export function isLocaleCode(value: string): value is LocaleCode {
  return LOCALES.some((l) => l.code === value);
}

export function localeLabel(code: string): string {
  return LOCALES.find((l) => l.code === code)?.name ?? LOCALES[0].name;
}

/** Same cookie every switcher writes — normalized here so every call site
 * (pre-login pages, post-login Settings/TopBar) agrees on the exact
 * attributes instead of each hand-rolling a slightly different string. */
export function setLocaleCookie(code: LocaleCode): void {
  document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** Swap the locale segment of a pathname, e.g. "/ru/sign-in" + "uz" -> "/uz/sign-in". */
export function withLocale(pathname: string, code: LocaleCode): string {
  return pathname.replace(/^\/(ru|uz|en)(\/|$)/, `/${code}$2`) || `/${code}`;
}
