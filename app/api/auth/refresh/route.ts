import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { rotateUserRefreshToken } from '@/lib/user-session-service';
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from '@/lib/auth-cookies';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Rate limiting on refresh endpoint: 30 requests per 15 minutes per IP
const refreshRateLimiter = rateLimit({
  interval: 15 * 60 * 1000,
  uniqueTokenPerInterval: 200,
});

export async function POST(request: NextRequest) {
  try {
    const rate = await refreshRateLimiter.check(request, 30);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many refresh requests. Try again later.' },
        { status: 429 }
      );
    }

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    await connectDB();

    const rotation = await rotateUserRefreshToken(refreshToken, request);

    // If reuse detection was triggered, clear all cookies and warn user
    if (!rotation.success) {
      const response = NextResponse.json(
        {
          error: rotation.error || 'Invalid refresh token',
          securityAlert: rotation.familyRevoked || false,
        },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Tokens rotated successfully',
        sessionId: rotation.session?._id.toString(),
      },
      { status: 200 }
    );

    // Set rotated Dual-Token cookies
    setAuthCookies(response, {
      accessToken: rotation.accessToken!,
      refreshToken: rotation.newRefreshToken!,
    });

    return response;
  } catch (error: any) {
    console.error('[Refresh Token Error]:', error);
    const response = NextResponse.json(
      { error: 'Session renewal failed' },
      { status: 500 }
    );
    return clearAuthCookies(response);
  }
}
