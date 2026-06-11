import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'aivita_session';
/** API-signed token cookie — verified by api.aivita.uz using ITS OWN SESSION_SECRET. */
const API_COOKIE = 'aivita_api';
/** Raw refresh token — HttpOnly, 7d, used to rotate access tokens. */
const REFRESH_COOKIE = 'aivita_refresh';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is required');
  return new TextEncoder().encode(secret);
}

const isV2 = () => process.env.SESSIONS_V2 === 'true';

export type AivitaSession = {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  role?: 'patient' | 'doctor' | 'admin';
  plan?: 'free' | 'plus' | 'pro';
  /** Raw JWT signed by the API server. Stored as aivita_api cookie for API calls. */
  apiToken?: string;
  /** Raw refresh token (v2 only). Stored as aivita_refresh cookie. */
  refreshToken?: string;
};

export async function getSession(): Promise<AivitaSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AivitaSession;
  } catch {
    return null;
  }
}

/** Returns the raw API token to forward to api.aivita.uz (already signed by the API). */
export async function getApiToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(API_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
}

export async function setSession(session: AivitaSession): Promise<void> {
  const { apiToken, refreshToken, ...sessionData } = session;
  const v2 = isV2();

  const accessTtlSeconds = v2 ? 60 * 60 : 60 * 60 * 24 * 30;

  const token = await new SignJWT({ ...sessionData })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(v2 ? '1h' : '30d')
    .sign(getSecret());

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();
  const base = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    domain: isProduction ? '.aivita.uz' : undefined,
  };

  cookieStore.set(SESSION_COOKIE, token, { ...base, maxAge: accessTtlSeconds });

  if (apiToken) {
    cookieStore.set(API_COOKIE, apiToken, { ...base, maxAge: accessTtlSeconds });
  }

  if (v2 && refreshToken) {
    cookieStore.set(REFRESH_COOKIE, refreshToken, {
      ...base,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }
}

export async function clearSession(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();

  const opts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
    domain: isProduction ? '.aivita.uz' : undefined,
  };

  cookieStore.set(SESSION_COOKIE, '', opts);
  cookieStore.set(API_COOKIE, '', opts);
  cookieStore.set(REFRESH_COOKIE, '', opts);
}
