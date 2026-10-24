import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/middleware';
import { revokeUserSession } from '@/lib/user-session-service';
import { clearAuthCookies } from '@/lib/auth-cookies';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);

    if (auth?.sessionId) {
      await connectDB();
      await revokeUserSession(auth.sessionId, 'User explicitly signed out');
    }

    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    });

    return clearAuthCookies(response);
  } catch (error: any) {
    console.error('Logout error:', error);
    const response = NextResponse.json({ success: true });
    return clearAuthCookies(response);
  }
}
