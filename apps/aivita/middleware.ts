import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const LOCALES = ['ru', 'uz', 'en'] as const;
const DEFAULT_LOCALE = 'ru';

const intlMiddleware = createIntlMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
});

// App routes — require authentication
const APP_ROUTES = [
  '/home',
  '/profile',
  '/vitals',
  '/gadgets',
  '/medications',
  '/habits',
  '/nutrition',
  '/chat',
  '/test',
  '/family',
  '/report',
  '/settings',
  '/notifications',
  '/install',
  // Doctor cabinet routes
  '/doctor-home',
  '/doctor-patients',
  '/doctor-patient',
  '/doctor-schedule',
  '/doctor-appointments',
  '/doctor-chats',
  '/doctor-prescriptions',
  '/doctor-ai',
  '/doctor-profile',
];

// Auth routes — redirect to /home if already authenticated
const AUTH_ROUTES_REDIRECT = ['/sign-in'];

const SESSION_COOKIE = 'aivita_session';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET missing');
  return new TextEncoder().encode(secret);
}

/** Returns userId if cookie is a valid JWT, otherwise null */
async function getSessionUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = (payload as { userId?: string }).userId;
    return userId ?? null;
  } catch {
    return null;
  }
}

/** Clears the session cookie and redirects to sign-in */
function forceLogout(request: NextRequest, locale: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/sign-in`;
  const res = NextResponse.redirect(url);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookies.set(SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  });
  return res;
}

// Strip locale prefix to get the real path
function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(ru|uz|en)(\/|$)/, '/') || '/';
}

// Extract locale from pathname (falls back to DEFAULT_LOCALE)
function extractLocale(pathname: string): string {
  const m = pathname.match(/^\/(ru|uz|en)(\/|$)/);
  return m ? m[1] : DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and internal Next.js API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/og') ||
    pathname.startsWith('/splash') ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const userId   = await getSessionUserId(request);
  const isAuth   = !!userId;
  const realPath = stripLocale(pathname);
  const locale   = extractLocale(pathname);

  const isAppRoute = APP_ROUTES.some(
    (r) => realPath === r || realPath.startsWith(r + '/')
  );
  const isAuthRedirectRoute = AUTH_ROUTES_REDIRECT.some(
    (r) => realPath === r || realPath.startsWith(r + '/')
  );
  const isOnboarding = realPath.startsWith('/onboarding');

  // App route + not authenticated → redirect to /{locale}/sign-in
  if (isAppRoute && !isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    if (realPath !== '/home') {
      url.searchParams.set('from', realPath);
    }
    return NextResponse.redirect(url);
  }

  // sign-in + authenticated → redirect to /{locale}/home
  if (isAuthRedirectRoute && isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/home`;
    return NextResponse.redirect(url);
  }

  // Onboarding + not authenticated → redirect to /{locale}/sign-in
  if (isOnboarding && !isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    return NextResponse.redirect(url);
  }

  // Invalid JWT (token exists but can't verify) — force logout
  if (!isAuth && request.cookies.get(SESSION_COOKIE)?.value) {
    return forceLogout(request, locale);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js API routes
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest|icons|og|splash|api/).*)',
  ],
};
