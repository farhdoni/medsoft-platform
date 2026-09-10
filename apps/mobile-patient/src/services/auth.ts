import * as SecureStore from 'expo-secure-store';
import CookieManager, { type Cookies } from '@react-native-cookies/cookies';
import { API_URL, WEB_URL } from '../constants/config';

const TOKEN_KEY = 'auth_token';
const BIOMETRIC_KEY = 'biometric_enabled';

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Reads the web session JWT (aivita_api / aivita_session) from the NATIVE WebView
 * cookie jar via CookieManager. httpOnly-safe (no JS injection). Prefer aivita_api
 * (API-signed — always verifiable by the API), fall back to legacy aivita_session.
 * Sent to the API as the `X-Aivita-Session` header — the only credential the API
 * accepts (it does NOT read `Authorization: Bearer`). Used from background contexts
 * (Health Connect sync, medication notification actions) where there is no live
 * WebView and no real JWT. Cookie lives on the web origin; fall back to the API host.
 */
export async function getSessionToken(): Promise<string | null> {
  const pick = (c: Cookies): string | null =>
    c.aivita_api?.value ?? c.aivita_session?.value ?? null;
  try {
    const web = await CookieManager.get(WEB_URL);
    const token = pick(web);
    if (token) return token;
  } catch {
    // web origin unavailable — try the API host below
  }
  try {
    const api = await CookieManager.get(API_URL);
    return pick(api);
  } catch {
    return null;
  }
}

/**
 * Reads the long-lived refresh cookie (aivita_refresh, 7 days) the same
 * httpOnly-safe way getSessionToken() reads the 1-hour access token. Only set
 * when SESSIONS_V2=true (apps/aivita/lib/auth/session.ts, setSession) — prod
 * runs with that flag on, so aivita_api expires in an hour and this is what
 * lets a background action mint a fresh one without the user having opened
 * the app.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const web = await CookieManager.get(WEB_URL);
    return web.aivita_refresh?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Mints a fresh aivita_api by calling the web app's own refresh route — the
 * same one its Next.js middleware calls when the WebView's session is close
 * to expiry (apps/aivita/app/api/auth/refresh/route.ts). Reusing it here
 * means no new server endpoint and no change to requireAivitaAuth / Bearer
 * support on the API — this stays entirely inside the mobile client.
 *
 * That route reads its input off an actual `Cookie` request header via
 * Next.js's `request.cookies` (not the `X-Aivita-Session` header
 * requireAivitaAuth accepts), so the refresh token has to be sent that way.
 * React Native's fetch does not block "forbidden" header names the way a
 * browser's does, so this is safe to set directly.
 *
 * The response carries the new tokens as Set-Cookie headers, not JSON —
 * RN's fetch does not merge those into CookieManager's jar automatically on
 * every platform/version, so CookieManager.getFromResponse() (the library's
 * own documented mechanism for reading cookies off the last response) is used
 * instead of trying to parse `res.headers.get('set-cookie')` by hand, which
 * cannot reliably separate three same-named Set-Cookie headers into one string.
 *
 * `explicitRefreshToken` lets the biometric-login flow restore a session from
 * the copy saved in SecureStore (see LoginScreen.tsx) without depending on the
 * WebView's cookie jar still holding aivita_refresh — the jar is the normal
 * source (via getRefreshToken()) but isn't guaranteed to survive indefinitely,
 * while SecureStore is the durable copy biometric unlock is built around.
 *
 * The API route ROTATES the refresh token on every successful call (verified
 * live: reusing a spent one 401s) — SecureStore's copy is refreshed here too,
 * on every success, not just written once at login. Skipping this would make
 * biometric login work exactly once: the second attempt would replay a
 * refresh token the server already invalidated.
 */
export async function refreshSessionToken(explicitRefreshToken?: string): Promise<string | null> {
  const refreshToken = explicitRefreshToken ?? await getRefreshToken().catch(() => null);
  if (!refreshToken) return null; // the refresh token itself is gone — nothing to try

  try {
    const res = await fetch(`${WEB_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `aivita_refresh=${refreshToken}` },
    });
    if (!res.ok) return null;
  } catch {
    return null;
  }

  try {
    const fromResponse = await CookieManager.getFromResponse(WEB_URL);
    if (fromResponse.aivita_refresh?.value) {
      await SecureStore.setItemAsync(TOKEN_KEY, fromResponse.aivita_refresh.value).catch(() => {});
    }
    if (fromResponse.aivita_api?.value) return fromResponse.aivita_api.value;
  } catch {
    // fall through to a plain re-read below
  }

  // Belt and suspenders: on builds where Set-Cookie DOES get applied to the
  // jar automatically, a plain re-read also picks up the fresh access token
  // (and, via getRefreshToken(), the rotated refresh token for SecureStore).
  const [access, rotatedRefresh] = await Promise.all([
    getSessionToken().catch(() => null),
    getRefreshToken().catch(() => null),
  ]);
  if (rotatedRefresh) await SecureStore.setItemAsync(TOKEN_KEY, rotatedRefresh).catch(() => {});
  return access;
}

export async function saveAuthToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return val === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, '1');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  }
}
