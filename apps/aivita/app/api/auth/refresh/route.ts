import { type NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const SESSION_COOKIE = 'aivita_session';
const API_COOKIE = 'aivita_api';
const REFRESH_COOKIE = 'aivita_refresh';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is required');
  return new TextEncoder().encode(secret);
}

// POST /api/auth/refresh — called by Next.js middleware when access token is near expiry
export async function POST(request: NextRequest) {
  if (process.env.SESSIONS_V2 !== 'true') {
    return NextResponse.json({ error: 'not_enabled' }, { status: 404 });
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'no_refresh_token' }, { status: 401 });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const apiUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  let data: { session: Record<string, unknown>; apiToken: string; refreshToken: string };
  try {
    const res = await fetch(`${apiUrl}/v1/aivita/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
    }

    const json = await res.json() as { data: typeof data };
    data = json.data;
  } catch {
    return NextResponse.json({ error: 'api_unreachable' }, { status: 502 });
  }

  // Issue new Next.js session cookie
  const sessionToken = await new SignJWT({ ...data.session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSecret());

  const response = NextResponse.json({ ok: true });
  const base = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  };

  response.cookies.set(SESSION_COOKIE, sessionToken, { ...base, maxAge: 60 * 60 });
  response.cookies.set(API_COOKIE, data.apiToken, { ...base, maxAge: 60 * 60 });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 });

  return response;
}
