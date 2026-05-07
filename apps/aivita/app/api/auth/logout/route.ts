import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'aivita_session';

// GET /api/auth/logout?locale=ru  — clears cookie then redirects to sign-in
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ru';

  // In production, use the public domain directly — request.url inside Docker
  // resolves to the internal container hostname (e.g. 61210942dfe4:80), not aivita.uz
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction
    ? 'https://aivita.uz'
    : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const response = NextResponse.redirect(new URL(`/${locale}/sign-in`, baseUrl));

  // Clear with domain (matches how it was set)
  response.cookies.set(SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  });

  return response;
}

// POST — clears cookie, client handles redirect
export async function POST() {
  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  });
  return response;
}
