// middleware.ts
// Simple password protection for beta testing
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'talktrack-beta-auth';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow login page and auth API
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip if no password is configured (public mode)
  const password = process.env.PASSFORT_PASSWORD;
  if (!password) {
    return NextResponse.next();
  }

  // Check for valid auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME);
  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  // Redirect to login page
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sounds|sw.js|workbox).*)',
  ],
};
