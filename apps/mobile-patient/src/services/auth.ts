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
