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

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = localeCookie && ['ru', 'uz', 'en'].includes(localeCookie) ? localeCookie : 'ru';

  // Base messages from JSON (always present)
  const base = (await import(`../messages/${locale}.json`)).default;

  // Overlay with DB content (fails silently → JSON is the fallback)
  const overrides = await fetchDbOverrides(locale);
  const messages = overrides
    ? mergeDeep(base, overrides)
    : base;

  return { locale, messages };
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
