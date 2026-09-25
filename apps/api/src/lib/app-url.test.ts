import { describe, it, expect } from 'vitest';
import { buildAppUrl } from './app-url-build.js';

const BASE = 'https://app.aivita.uz';

describe('buildAppUrl', () => {
  it('prefixes the account locale', () => {
    expect(buildAppUrl(BASE, '/settings/subscription?status=success', 'uz'))
      .toBe('https://app.aivita.uz/uz/settings/subscription?status=success');
  });

  it('falls back to ru for a missing or unknown locale', () => {
    expect(buildAppUrl(BASE, '/messenger/abc', null)).toBe('https://app.aivita.uz/ru/messenger/abc');
    expect(buildAppUrl(BASE, '/messenger/abc', 'de')).toBe('https://app.aivita.uz/ru/messenger/abc');
  });

  it('normalizes region suffixes and slashes', () => {
    expect(buildAppUrl(`${BASE}/`, 'sign-up?ref=AB12', 'en-US'))
      .toBe('https://app.aivita.uz/en/sign-up?ref=AB12');
  });
});
