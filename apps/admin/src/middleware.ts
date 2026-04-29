import { NextRequest, NextResponse } from 'next/server';

// Routes accessible without authentication
const PUBLIC_PATHS = ['/auth/login', '/auth/verify', '/auth/setup-2fa', '/auth/verify-2fa'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // JWT access token — httpOnly cookie set by API on successful TOTP verify
  const token = request.cookies.get('access_token')?.value;

  if (isPublic) {
    // Already authenticated and trying to access login → go to dashboard
    if (token && pathname.startsWith('/auth/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected route — require token
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
