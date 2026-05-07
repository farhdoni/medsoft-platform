import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'aivita_session';

// GET /api/auth/logout?locale=ru  — clears cookie then redirects to sign-in
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ru';
  const response = NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));

  const isProduction = process.env.NODE_ENV === 'production';

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

// Keep POST for backward compat
export async function POST() {
  const response = NextResponse.json({ ok: true });
  const isProduction = process.env.NODE_ENV === 'production';
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
