import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware is currently a passthrough. 
 * Client-side logic in `hooks/use-auth.tsx` handles authentication and redirection for protected routes.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/customers/:path*',
    '/balance/:path*',
    '/onboarding/:path*',
    '/install/:path*',
    '/pricing/:path*',
  ],
};
