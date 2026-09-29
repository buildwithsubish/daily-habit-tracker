import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAdminToken, 
  generateAdminToken, 
  generateAdminRefreshToken, 
  AdminTokenPayload,
  getAdminJwtSecret,
} from './admin-auth';
import { rateLimit } from './rate-limit';

export const runtime = 'nodejs';


export interface AdminAuthResult {
  adminId: string;
  email?: string;
  role: 'admin' | 'super_admin';
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
  
  return {
    adminId: decoded.adminId,
    email: decoded.email,
    role: decoded.role || 'admin',
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
    if (token) {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as AdminTokenPayload;
      
      const exp = decoded.exp! * 1000;
      const shouldRefresh = exp - Date.now() < 60 * 60 * 1000;
      
      return {
        valid: true,
        shouldRefresh,
        admin: {
          adminId: decoded.adminId,
          email: decoded.email,
          role: decoded.role || 'admin',
          twoFactorVerified: decoded.twoFactorVerified || false,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      };
    }
  } catch (error) {
    // Token is invalid or expired
  }
  
  return { valid: false, shouldRefresh: false };
}

export function createAdminTokenResponse(
  adminId: string,
  options?: {
    email?: string;
    role?: 'admin' | 'super_admin';
    twoFactorVerified?: boolean;
  }
): NextResponse {
  const token = generateAdminToken(adminId, options);
  const refreshToken = generateAdminRefreshToken(adminId);
  
  const response = NextResponse.json({ 
    success: true, 
    adminId 
  });
  
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });
  
  response.cookies.set('admin_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
  
  return response;
}

export function clearAdminSession(): NextResponse {
  const response = NextResponse.json({ success: true });
  
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  
  response.cookies.set('admin_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  
  return response;
}

// Rate limiter for admin endpoints
export const adminRateLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 100,
});

export default {
  getAdminIdFromRequest,
  getAdminFromRequest,
  requireAdmin,
  isAdminAuthenticated,
  validateAdminSession,
  createAdminTokenResponse,
  clearAdminSession,
  adminRateLimiter,
};
