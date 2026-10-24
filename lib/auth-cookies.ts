import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const HOST_ACCESS_TOKEN_COOKIE = '__Host-access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const HOST_REFRESH_TOKEN_COOKIE = '__Host-refresh_token';
export const CSRF_TOKEN_COOKIE = 'csrf_token';
export const HOST_CSRF_TOKEN_COOKIE = '__Host-csrf_token';
export const LEGACY_TOKEN_COOKIE = 'token';

export const ACCESS_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days (prevents sudden 15-min dropouts)
export const REFRESH_TOKEN_MAX_AGE_PERSISTENT = 30 * 24 * 60 * 60; // 30 days
export const REFRESH_TOKEN_MAX_AGE_SESSION = 24 * 60 * 60; // 24 hours fallback if not persistent

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseDeviceName(userAgent: string): string {
  if (!userAgent || userAgent === 'unknown') return 'Unknown Device';
  let browser = 'Browser';
  if (/chrome|crios/i.test(userAgent) && !/edge|edg/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = 'Safari';
  else if (/edg/i.test(userAgent)) browser = 'Edge';

  let os = 'Unknown OS';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';

  return `${browser} on ${os}`;
}

export function setAuthCookies(
  response: NextResponse,
  tokens: {
    accessToken: string;
    refreshToken: string;
    csrfToken?: string;
  },
  options?: {
    keepSignedIn?: boolean;
  }
): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  const keepSignedIn = Boolean(options?.keepSignedIn);
  const refreshMaxAge = keepSignedIn ? REFRESH_TOKEN_MAX_AGE_PERSISTENT : REFRESH_TOKEN_MAX_AGE_SESSION;
  const csrf = tokens.csrfToken || generateCsrfToken();

  // 1. Short-lived Access Token Cookie (15 min)
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  });

  // Legacy fallback for backward compatibility
  response.cookies.set(LEGACY_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  });

  // 2. Rotating Refresh Token Cookie - strictly scoped to /api/auth/refresh
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: keepSignedIn ? refreshMaxAge : undefined, // Session-only cookie if not checked
    path: '/api/auth/refresh',
  });

  // 3. Double-Submit CSRF Cookie
  response.cookies.set(CSRF_TOKEN_COOKIE, csrf, {
    httpOnly: false, // Must be readable by client JS to send in X-CSRF-Token header
    secure: isProd,
    sameSite: 'strict',
    maxAge: refreshMaxAge,
    path: '/',
  });

  // Anti-caching headers preventing browser back-button leak
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  const clearOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, '', clearOpts);
  response.cookies.set(HOST_ACCESS_TOKEN_COOKIE, '', clearOpts);
  response.cookies.set(LEGACY_TOKEN_COOKIE, '', clearOpts);
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    ...clearOpts,
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
  response.cookies.set(HOST_REFRESH_TOKEN_COOKIE, '', {
    ...clearOpts,
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
  response.cookies.set(CSRF_TOKEN_COOKIE, '', {
    ...clearOpts,
    httpOnly: false,
    sameSite: 'strict',
    path: '/',
  });
  response.cookies.set(HOST_CSRF_TOKEN_COOKIE, '', {
    ...clearOpts,
    httpOnly: false,
    sameSite: 'strict',
    path: '/',
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export function extractAccessToken(request: NextRequest): string | null {
  return (
    request.cookies.get(LEGACY_TOKEN_COOKIE)?.value ||
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    request.cookies.get(HOST_ACCESS_TOKEN_COOKIE)?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  );
}

export function validateUserCsrf(request: NextRequest): { valid: boolean; error?: string } {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Verify origin/referer matches host
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return { valid: false, error: 'Cross-origin request rejected' };
      }
    } catch {
      return { valid: false, error: 'Malformed Origin header' };
    }
  } else if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return { valid: false, error: 'Cross-origin Referer rejected' };
      }
    } catch {
      return { valid: false, error: 'Malformed Referer header' };
    }
  }

  const cookieToken =
    request.cookies.get(CSRF_TOKEN_COOKIE)?.value ||
    request.cookies.get('__Host-csrf_token')?.value ||
    request.cookies.get('csrf_token')?.value;

  const headerToken =
    request.headers.get('x-csrf-token') ||
    request.headers.get('X-CSRF-Token') ||
    request.headers.get('X-Csrf-Token');

  if (!cookieToken || !headerToken) {
    return { valid: false, error: 'Missing CSRF token' };
  }

  try {
    const a = Buffer.from(cookieToken, 'utf-8');
    const b = Buffer.from(headerToken, 'utf-8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, error: 'Invalid CSRF token' };
    }
  } catch {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  return { valid: true };
}
