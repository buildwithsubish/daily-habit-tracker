import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminTokenEdge } from './lib/admin-auth-edge';

// Public routes that don't require authentication
const publicAdminRoutes = [
  '/admin/login',
  '/admin/setup',
  '/admin/password',
  '/admin/reset-password',
  '/api/admin/login',
  '/api/admin/setup',
  '/api/admin/password',
  '/api/admin/reset-password',
  '/api/admin/status',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only handle admin routes (matcher below also limits scope)
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const isPublicRoute = publicAdminRoutes.includes(pathname);

  if (isPublicRoute) {
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
      );
    }

    return response;
  }

  const token =
    request.cookies.get('admin_token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const decoded = await verifyAdminTokenEdge(token);

  if (!decoded) {
    if (pathname.startsWith('/api/admin')) {
      const response = NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
      response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('admin_refresh_token', '', { maxAge: 0, path: '/' });
      return response;
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('admin_refresh_token', '', { maxAge: 0, path: '/' });
    return response;
  }

  if (decoded.passwordResetRequired) {
    const allowedWhilePasswordReset = new Set([
      '/admin/settings',
      '/api/admin/account/password',
      '/api/admin/status',
      '/api/admin/logout',
    ]);
    if (!allowedWhilePasswordReset.has(pathname)) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Update your admin password to continue.', code: 'PASSWORD_RESET_REQUIRED' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
      }
      return NextResponse.redirect(new URL('/admin/settings?tab=security', request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('x-admin-id', decoded.adminId);
  response.headers.set('x-admin-role', decoded.role || 'admin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
