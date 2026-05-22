import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rewrite / to landing.html (static HTML in public/)
  if (request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/landing.html', request.url));
  }
}

export const config = {
  matcher: '/',
};
