import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware - Authentication Bypass
 * 
 * - Currently allows all requests to proceed without session validation.
 */

export function middleware(request: NextRequest) {
  // Bypass authentication for all routes
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
