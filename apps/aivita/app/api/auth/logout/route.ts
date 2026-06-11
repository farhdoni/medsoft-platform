import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'aivita_session';
const API_COOKIE = 'aivita_api';
const REFRESH_COOKIE = 'aivita_refresh';

// GET /api/auth/logout?locale=ru  — clears cookie then redirects to sign-in
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ru';

  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction
    ? 'https://aivita.uz'
    : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  // Revoke refresh token on API side before clearing cookies (best-effort)
  if (process.env.SESSIONS_V2 === 'true') {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      try {
        const apiUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
        await fetch(`${apiUrl}/v1/aivita/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // non-fatal — cookie will expire naturally
      }
    }
  }

  const response = NextResponse.redirect(new URL(`/${locale}/sign-in`, baseUrl));

  const cookieOpts = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  };
  response.cookies.set(SESSION_COOKIE, '', cookieOpts);
  response.cookies.set(API_COOKIE, '', cookieOpts);
  response.cookies.set(REFRESH_COOKIE, '', cookieOpts);

  return response;
}

// POST — clears cookies, client handles redirect
export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Revoke refresh token on API side (best-effort)
  if (process.env.SESSIONS_V2 === 'true') {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      try {
        const apiUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
        await fetch(`${apiUrl}/v1/aivita/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // non-fatal
      }
    }
  }

  const response = NextResponse.json({ ok: true });
  const cookieOpts = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  };
  response.cookies.set(SESSION_COOKIE, '', cookieOpts);
  response.cookies.set(API_COOKIE, '', cookieOpts);
  response.cookies.set(REFRESH_COOKIE, '', cookieOpts);
  return response;
}
