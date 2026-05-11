import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'aivita_session';
/** API-signed token cookie — verified by api.aivita.uz using ITS OWN SESSION_SECRET.
 *  Fixes the SESSION_SECRET mismatch between the Next.js server and the API server. */
const API_COOKIE = 'aivita_api';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is required');
  return new TextEncoder().encode(secret);
}

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

export async function setSession(session: AivitaSession): Promise<void> {
  const { apiToken, ...sessionData } = session;

  // 1. Next.js JWT cookie — used by Next.js server for session reads
  const token = await new SignJWT({ ...sessionData })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    domain: isProduction ? '.aivita.uz' : undefined,
  });

  // 2. API cookie — raw JWT signed by the API server, forwarded on every API request.
  //    This allows api.aivita.uz to verify with its own SESSION_SECRET independently.
  if (apiToken) {
    cookieStore.set(API_COOKIE, apiToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      domain: isProduction ? '.aivita.uz' : undefined,
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
}
