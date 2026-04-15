import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from './lib/admin-auth';


// Public routes that don't require authentication
const publicAdminRoutes = [
  '/admin/login',
  '/admin/reset-password',
  '/api/admin/login',
  '/api/admin/reset-password',
  '/api/admin/init',
  '/api/admin/status',
  '/api/admin/whatsapp/session',
  '/api/admin/whatsapp/phone-login',
];

// Routes that require authentication
const protectedAdminRoutes = [
  '/admin/dashboard',
  '/admin/users',
  '/admin/whatsapp',
  '/admin/analytics',
  '/admin/settings',
  '/admin/team',
  '/admin/presets',
  '/admin/billing',
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip non-admin routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }
  
  // Check if it's a public route
  const isPublicRoute = publicAdminRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    // For public admin routes, just add security headers
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Only add CSP in production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
      );
    }
    
    return response;
  }
  
  // Get admin token from cookie or Authorization header
  const token = request.cookies.get('admin_token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');
  
  // If no token, redirect to login
  if (!token) {
    // If it's an API route, return 401
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For page routes, redirect to login
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Verify token
  const decoded = verifyAdminToken(token);
  
  if (!decoded) {
    // Invalid token - clear cookies and redirect
    if (pathname.startsWith('/api/admin')) {
      const response = NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
      
      // Clear invalid cookies
      response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('admin_refresh_token', '', { maxAge: 0, path: '/' });
      
      return response;
    }
    
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    
    // Clear invalid cookies
    response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('admin_refresh_token', '', { maxAge: 0, path: '/' });
    
    return response;
  }
  
  // Token is valid - add security headers and continue
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Add user info to headers for backend use
  response.headers.set('x-admin-id', decoded.adminId);
  response.headers.set('x-admin-role', decoded.role || 'admin');
  
  // Only add CSP in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all admin paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public files
     */
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
