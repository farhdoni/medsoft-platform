import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // JWT access token — httpOnly cookie set by API on successful login
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
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
