// middleware.ts
// Simple password protection for beta testing
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'talktrack-beta-auth';

export function middleware(request: NextRequest) {
  // Skip if no password is configured (public mode)
  const password = process.env.PASSFORT_PASSWORD;
  if (!password) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // Allow login page and API routes
  if (pathname === '/login' || pathname === '/api/beta-auth') {
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
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - manifest.json (needed for PWA install)
     * - icons/ (PWA icons)
     * - sounds/ (earcon audio files)
     * - sw.js (service worker)
     * - workbox-*.js (service worker dependencies)
     * - .well-known/ (digital asset links for TWA)
     * - api/ routes except beta-auth (keep API accessible)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/|sounds/|sw\\.js|workbox-.*\\.js|\\.well-known/|api/).*)',
  ],
};
