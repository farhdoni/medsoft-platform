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
  '/medical-card',
  '/ai-chat',
  '/ai-checkup',
  '/chats',
  '/pharmacy',
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

const SESSION_COOKIE  = 'aivita_session';
const REFRESH_COOKIE  = 'aivita_refresh';
// Set when a refresh attempt is in flight — cleared on success or logout.
// Prevents refresh-loop: if this cookie is still present on the NEXT request
// after attempting a refresh, something is broken → force logout immediately.
const REFRESH_ATTEMPT = 'aivita_refresh_attempt';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET missing');
  return new TextEncoder().encode(secret);
}

type SessionInfo = { userId: string; exp: number } | null;

/** Returns userId + exp if cookie is a valid JWT, otherwise null */
async function getSessionInfo(request: NextRequest): Promise<SessionInfo> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = (payload as { userId?: string }).userId;
    const exp    = (payload as { exp?: number }).exp ?? 0;
    return userId ? { userId, exp } : null;
  } catch {
    return null;
  }
}

/** Clears all session cookies and redirects to sign-in */
function forceLogout(request: NextRequest, locale: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/sign-in`;
  const res = NextResponse.redirect(url);
  const isProduction = process.env.NODE_ENV === 'production';
  const opts = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  };
  res.cookies.set(SESSION_COOKIE,  '', opts);
  res.cookies.set('aivita_api',    '', opts);
  res.cookies.set(REFRESH_COOKIE,  '', opts);
  res.cookies.set(REFRESH_ATTEMPT, '', opts);
  return res;
}

// Strip locale prefix to get the real path
function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(ru|uz|en)(\/|$)/, '/') || '/';
}

// Extract locale from pathname.
// Priority: 1) explicit locale in URL  2) NEXT_LOCALE cookie  3) default
function extractLocale(pathname: string, request?: NextRequest): string {
  const m = pathname.match(/^\/(ru|uz|en)(\/|$)/);
  if (m) return m[1];

  if (request) {
    const cookie = request.cookies.get('NEXT_LOCALE')?.value;
    if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie;
  }

  return DEFAULT_LOCALE;
}

/** Proactively refresh access token when it expires within 5 minutes.
 *  Returns a NextResponse with updated cookies, or null if refresh not needed/failed. */
async function tryProactiveRefresh(
  request:  NextRequest,
  session:  NonNullable<SessionInfo>,
  locale:   string,
): Promise<NextResponse | null> {
  if (process.env.SESSIONS_V2 !== 'true') return null;

  const hasRefreshToken = !!request.cookies.get(REFRESH_COOKIE)?.value;
  if (!hasRefreshToken) return null;

  const expiresIn = session.exp - Math.floor(Date.now() / 1000);
  // Only refresh if access token expires within 5 minutes
  if (expiresIn > 5 * 60) return null;

  // ── Refresh-loop guard ───────────────────────────────────────────────────
  // If aivita_refresh_attempt is already set, it means we attempted a refresh
  // on the previous request and the new access token still failed to verify.
  // This signals a broken loop — force clean logout instead of retrying.
  if (request.cookies.get(REFRESH_ATTEMPT)?.value) {
    return forceLogout(request, locale);
  }

  // Mark that a refresh is in progress (cleared on success by setting maxAge=0)
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieBase = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    ...(isProduction ? { domain: '.aivita.uz' } : {}),
  };

  // Call our own /api/auth/refresh route (same process, no network hop)
  const refreshUrl = new URL('/api/auth/refresh', request.nextUrl.origin);
  const refreshReq = new Request(refreshUrl.toString(), {
    method:  'POST',
    headers: { cookie: request.headers.get('cookie') ?? '' },
  });

  let refreshRes: Response;
  try {
    refreshRes = await fetch(refreshReq);
  } catch {
    // API unreachable — mark attempt and let request proceed (will fail on next)
    const cont = NextResponse.next();
    cont.cookies.set(REFRESH_ATTEMPT, '1', { ...cookieBase, maxAge: 30 });
    return cont;
  }

  if (!refreshRes.ok) {
    // Refresh rejected (revoked/expired) — force logout
    return forceLogout(request, locale);
  }

  // Success — forward the new Set-Cookie headers from the refresh response
  const next = NextResponse.next();
  refreshRes.headers.getSetCookie?.().forEach((c) => {
    next.headers.append('set-cookie', c);
  });
  // Ensure the attempt guard is cleared
  next.cookies.set(REFRESH_ATTEMPT, '', { ...cookieBase, maxAge: 0 });
  return next;
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

  const session = await getSessionInfo(request);
  const isAuth  = !!session;
  const realPath = stripLocale(pathname);
  const locale   = extractLocale(pathname, request);

  const isAppRoute = APP_ROUTES.some(
    (r) => realPath === r || realPath.startsWith(r + '/')
  );
  const isAuthRedirectRoute = AUTH_ROUTES_REDIRECT.some(
    (r) => realPath === r || realPath.startsWith(r + '/')
  );
  const isOnboarding = realPath.startsWith('/onboarding');

  // Root locale route (/) — always redirect: auth → /home, guest → /sign-in
  if (realPath === '/') {
    const url = request.nextUrl.clone();
    url.pathname = isAuth ? `/${locale}/home` : `/${locale}/sign-in`;
    return NextResponse.redirect(url);
  }

  // App route + authenticated → proactive refresh check (SESSIONS_V2 only)
  if (isAppRoute && isAuth && session) {
    const refreshed = await tryProactiveRefresh(request, session, locale);
    if (refreshed) return refreshed;
  }

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
    return forceLogout(request, extractLocale(pathname, request));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js API routes
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest|icons|og|splash|api/).*)',
  ],
};
