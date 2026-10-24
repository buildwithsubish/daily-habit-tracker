import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAdminToken, 
  generateAdminToken, 
  generateAdminRefreshToken, 
  AdminTokenPayload,
  getAdminJwtSecret,
} from './admin-auth';
import type { AdminRole } from './models/Admin';
import { rateLimit } from './rate-limit';
import { validateCsrf, CSRF_COOKIE_NAME } from './csrf';

export const runtime = 'nodejs';

export interface AdminAuthResult {
  adminId: string;
  email?: string;
  role: AdminRole;
  sessionId?: string;
  sessionToken?: string;
  twoFactorVerified: boolean;
  ipAddress: string;
  userAgent: string;
}

function getAdminTokenFromRequest(request: NextRequest): string | null {
  return (
    request.cookies.get('admin_token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    null
  );
}

export function getAdminIdFromRequest(request: NextRequest): string | null {
  const token = getAdminTokenFromRequest(request);
  if (!token) return null;
  
  const decoded = verifyAdminToken(token);
  return decoded?.adminId || null;
}

export function getAdminFromRequest(request: NextRequest): AdminAuthResult | null {
  const token = getAdminTokenFromRequest(request);
  
  if (!token) return null;
  
  const decoded = verifyAdminToken(token);
  if (!decoded) return null;
  
  const sessionToken = request.cookies.get('admin_session_token')?.value || decoded.sessionToken;

  return {
    adminId: decoded.adminId,
    email: decoded.email,
    role: (decoded.role as AdminRole) || 'admin',
    sessionId: decoded.sessionId,
    sessionToken,
    twoFactorVerified: decoded.twoFactorVerified || false,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export function requireAdmin(request: NextRequest): AdminAuthResult {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    throw new Error('Unauthorized');
  }
  return admin;
}

export function requireAdminWithRole(
  request: NextRequest,
  allowedRoles: AdminRole[]
): AdminAuthResult {
  const admin = requireAdmin(request);
  if (!allowedRoles.includes(admin.role)) {
    throw new Error('Forbidden: Insufficient privileges for this role');
  }
  return admin;
}

export function requireCsrfCheck(request: NextRequest): void {
  const csrf = validateCsrf(request);
  if (!csrf.valid) {
    throw new Error(`CSRF validation failed: ${csrf.error || 'Invalid CSRF token'}`);
  }
}

export function isAdminAuthenticated(request: NextRequest): boolean {
  return getAdminFromRequest(request) !== null;
}

export async function validateAdminSession(request: NextRequest): Promise<{
  valid: boolean;
  shouldRefresh: boolean;
  admin?: AdminAuthResult;
}> {
  const token = request.cookies.get('admin_token')?.value;
  
  if (!token) {
    return { valid: false, shouldRefresh: false };
  }
  
  const jwt = await import('jsonwebtoken');
  
  try {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as AdminTokenPayload;
    const exp = decoded.exp! * 1000;
    // If less than 5 minutes remain in the 15-minute token, mark for refresh
    const shouldRefresh = exp - Date.now() < 5 * 60 * 1000;
    
    return {
      valid: true,
      shouldRefresh,
      admin: {
        adminId: decoded.adminId,
        email: decoded.email,
        role: (decoded.role as AdminRole) || 'admin',
        sessionId: decoded.sessionId,
        sessionToken: decoded.sessionToken,
        twoFactorVerified: decoded.twoFactorVerified || false,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    };
  } catch {
    return { valid: false, shouldRefresh: false };
  }
}

export function createAdminTokenResponse(
  adminId: string,
  options?: {
    email?: string;
    role?: AdminRole;
    sessionId?: string;
    sessionToken?: string;
    twoFactorVerified?: boolean;
  }
): NextResponse {
  const token = generateAdminToken(adminId, options);
  const refreshToken = generateAdminRefreshToken(adminId);
  
  const response = NextResponse.json({ 
    success: true, 
    adminId 
  });
  
  // Short session expiration (15 minutes) for maximum security
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60,
    path: '/',
  });
  
  response.cookies.set('admin_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  if (options?.sessionToken) {
    response.cookies.set('admin_session_token', options.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/',
    });
  }
  
  return response;
}

export function clearAdminSession(): NextResponse {
  const response = NextResponse.json({ success: true });
  
  const clearCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/',
  };

  response.cookies.set('admin_token', '', clearCookieOptions);
  response.cookies.set('admin_refresh_token', '', clearCookieOptions);
  response.cookies.set('admin_session_token', '', clearCookieOptions);
  response.cookies.set(CSRF_COOKIE_NAME, '', { ...clearCookieOptions, httpOnly: false });
  
  return response;
}

// Rate limiter for admin endpoints (15-minute window for hardened security)
export const adminRateLimiter = rateLimit({
  interval: 15 * 60 * 1000,
  uniqueTokenPerInterval: 200,
});

export default {
  getAdminIdFromRequest,
  getAdminFromRequest,
  requireAdmin,
  requireAdminWithRole,
  requireCsrfCheck,
  isAdminAuthenticated,
  validateAdminSession,
  createAdminTokenResponse,
  clearAdminSession,
  adminRateLimiter,
};
