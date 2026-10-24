import { NextRequest } from 'next/server';
import { verifyAccessToken } from './auth';
import { ACCESS_TOKEN_COOKIE, HOST_ACCESS_TOKEN_COOKIE, LEGACY_TOKEN_COOKIE } from './auth-cookies';

export function getAuthFromRequest(request: NextRequest): { userId: string; sessionId?: string } | null {
  const token =
    request.cookies.get(LEGACY_TOKEN_COOKIE)?.value ||
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    request.cookies.get(HOST_ACCESS_TOKEN_COOKIE)?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return null;

  const decoded = verifyAccessToken(token);
  if (!decoded?.userId) {
    // If the primary token failed to decode, check alternate token cookies
    const altTokens = [
      request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
      request.cookies.get(HOST_ACCESS_TOKEN_COOKIE)?.value,
      request.cookies.get(LEGACY_TOKEN_COOKIE)?.value,
    ].filter((t): t is string => Boolean(t && t !== token));

    for (const alt of altTokens) {
      const altDecoded = verifyAccessToken(alt);
      if (altDecoded?.userId) {
        return {
          userId: altDecoded.userId,
          sessionId: altDecoded.sessionId,
        };
      }
    }
    return null;
  }

  return {
    userId: decoded.userId,
    sessionId: decoded.sessionId,
  };
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  const auth = getAuthFromRequest(request);
  return auth?.userId || null;
}

export function requireAuth(request: NextRequest): string {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}
