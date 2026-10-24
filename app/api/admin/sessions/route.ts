import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAdmin, adminRateLimiter } from '@/lib/admin-middleware';
import { getActiveAdminSessions } from '@/lib/admin-session-service';
import { apiError } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    const rate = await adminRateLimiter.check(request, 30);
    if (!rate.success) return apiError('Too many requests. Try again later.', 'RATE_LIMITED', 429);

    await connectDB();
    const currentSessionToken =
      request.cookies.get('admin_session_token')?.value || auth.sessionToken;

    const sessions = await getActiveAdminSessions(auth.adminId, currentSessionToken);

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('Fetch sessions error:', error);
    return apiError('Failed to fetch active sessions', 'INTERNAL_ERROR', 500);
  }
}
