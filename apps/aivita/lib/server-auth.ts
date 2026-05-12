/**
 * Shared server-side auth header builder for Next.js API proxy routes.
 * Prefers aivita_api cookie; falls back to aivita_session via X-Aivita-Session header.
 * Both are accepted by the API middleware (requireAivitaAuth).
 */
import { cookies } from 'next/headers';

export async function getProxyAuthHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const store = await cookies();
  const apiCookie = store.get('aivita_api')?.value;
  const sessionCookie = store.get('aivita_session')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };

  if (apiCookie) {
    headers['Cookie'] = `aivita_api=${apiCookie}`;
  } else if (sessionCookie) {
    headers['X-Aivita-Session'] = sessionCookie;
  }

  return headers;
}

export function isProxyAuthenticated(headers: Record<string, string>): boolean {
  return !!(headers['Cookie'] || headers['X-Aivita-Session']);
}
