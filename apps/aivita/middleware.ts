import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

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
  '/habits',
  '/nutrition',
  '/chat',
  '/test',
  '/family',
  '/report',
  '/settings',
  '/notifications',
  '/install',
];

// Auth routes — redirect to /home if already authenticated
const AUTH_ROUTES_REDIRECT = ['/sign-in'];

function hasSession(request: NextRequest): boolean {
  return !!request.cookies.get('aivita_session')?.value;
}

// Strip locale prefix to get the real path
function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(ru|uz|en)(\/|$)/, '/') || '/';
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

  const isAuthenticated = hasSession(request);
  const realPath = stripLocale(pathname);

  const isAppRoute = APP_ROUTES.some(
    (r) => realPath === r || realPath.startsWith(r + '/')
  );
  const isAuthRedirectRoute = AUTH_ROUTES_REDIRECT.some(
    (r) => realPath === r || realPath.startsWith(r + '/')
  );
  const isOnboarding = realPath.startsWith('/onboarding');

  // App route + not authenticated → redirect to /sign-in
  if (isAppRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    if (realPath !== '/home') {
      url.searchParams.set('from', realPath);
    }
    return NextResponse.redirect(url);
  }

  // sign-in + authenticated (not onboarding) → redirect to /home
  if (isAuthRedirectRoute && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  // Onboarding + not authenticated → redirect to /sign-in
  if (isOnboarding && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js API routes
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest|icons|og|splash|api/).*)',
  ],
};
