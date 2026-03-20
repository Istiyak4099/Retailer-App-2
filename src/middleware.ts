import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect dashboard and profile routes.
 * 
 * - Checks for the "auth_session" cookie.
 * - Redirects to /login if the cookie is missing.
 */

export function middleware(request: NextRequest) {
  const session = request.cookies.get('auth_session');

  // If no session cookie is found and the user is trying to access protected routes
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/customers/:path*',
    '/balance/:path*',
    '/onboarding/:path*',
    '/install/:path*',
  ],
};
