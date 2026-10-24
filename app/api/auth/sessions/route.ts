import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/middleware';
import {
  getUserActiveSessions,
  revokeAllOtherUserSessions,
  revokeUserSession,
} from '@/lib/user-session-service';
import { validateUserCsrf } from '@/lib/auth-cookies';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const sessions = await getUserActiveSessions(auth.userId, auth.sessionId);

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CSRF verification
    const csrf = validateUserCsrf(request);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error || 'CSRF verification failed' }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body can be empty
    }

    await connectDB();

    if (body.revokeAllOthers) {
      const revokedCount = await revokeAllOtherUserSessions(auth.userId, auth.sessionId);
      return NextResponse.json({
        success: true,
        message: `Successfully logged out of ${revokedCount} other device(s)`,
        revokedCount,
      });
    }

    if (body.sessionId) {
      await revokeUserSession(body.sessionId, 'Revoked by user from Security panel');
      return NextResponse.json({
        success: true,
        message: 'Device session revoked',
      });
    }

    return NextResponse.json({ error: 'Specify revokeAllOthers or sessionId' }, { status: 400 });
  } catch (error: any) {
    console.error('Revoke session error:', error);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
