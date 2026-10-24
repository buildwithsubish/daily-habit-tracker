import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const CSRF_COOKIE_NAME = 'admin_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a cryptographically strong CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates CSRF token from request headers against the CSRF cookie.
 * Also verifies origin/referer against host for cross-origin defense.
 */
export function validateCsrf(request: NextRequest): { valid: boolean; error?: string } {
  const method = request.method.toUpperCase();
  // Safe HTTP methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Verify origin or referer header against host
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

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken =
    request.headers.get(CSRF_HEADER_NAME) ||
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
    return { valid: false, error: 'CSRF token verification failed' };
  }

  return { valid: true };
}

/**
 * Injects or refreshes the CSRF token cookie into an outgoing response.
 */
export function attachCsrfCookie(
  response: NextResponse,
  token?: string
): { response: NextResponse; token: string } {
  const csrfToken = token || generateCsrfToken();
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by client JS to send in X-CSRF-Token header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  return { response, token: csrfToken };
}
