import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Ignore API, Next static files, webhook endpoints, and login page
  if (
    path.startsWith('/api') || 
    path.startsWith('/_next') || 
    path.startsWith('/webhook') || 
    path === '/login' ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('admin_auth');
  const expectedPassword = process.env.ADMIN_PASSWORD;

  // Check if expected password is set in .env and matches the cookie
  if (!expectedPassword || !authCookie || authCookie.value !== expectedPassword) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
