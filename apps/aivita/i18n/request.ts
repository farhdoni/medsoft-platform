import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/v1\/?$/, '');

/**
 * Fetch DB-managed landing content overrides.
 * Returns null silently on any error so JSON files remain the fallback.
 */
async function fetchDbOverrides(locale: string): Promise<Record<string, Record<string, string>> | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/landing/content/${locale}`, {
      next: { revalidate: 300 }, // ISR 5 min
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // DB unavailable — fall back to JSON silently
    return null;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  try {
    // Primary: URL locale set by next-intl middleware (e.g. /ru/, /uz/, /en/)
    const urlLocale = await requestLocale;
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    // URL locale takes priority; cookie is fallback for non-routed pages
    const raw = urlLocale ?? localeCookie;
    const locale = raw && ['ru', 'uz', 'en'].includes(raw) ? raw : 'ru';

    // Base messages from JSON (always present)
    const base = (await import(`../messages/${locale}.json`)).default;

    // Overlay with DB content (fails silently → JSON is the fallback)
    let overrides: Awaited<ReturnType<typeof fetchDbOverrides>> = null;
    try {
      overrides = await fetchDbOverrides(locale);
    } catch (fetchErr) {
      console.error('[i18n/request] fetchDbOverrides threw:', (fetchErr as Error)?.stack ?? fetchErr);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messages: any;
    try {
      messages = overrides ? mergeDeep(base, overrides) : base;
    } catch (mergeErr) {
      console.error('[i18n/request] mergeDeep threw:', (mergeErr as Error)?.stack ?? mergeErr);
      messages = base;
    }

    return { locale, messages };
  } catch (err) {
    console.error('[i18n/request] getRequestConfig threw:', (err as Error)?.stack ?? err);
    throw err;
  }
});

/** Deep merge: overlay values override base, nested objects are merged. */
function mergeDeep(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof result[k] === 'object') {
      result[k] = mergeDeep(result[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}
