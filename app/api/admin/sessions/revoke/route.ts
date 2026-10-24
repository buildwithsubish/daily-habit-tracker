import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAdmin, adminRateLimiter, requireCsrfCheck } from '@/lib/admin-middleware';
import { revokeAdminSession, revokeAllOtherAdminSessions } from '@/lib/admin-session-service';
import { adminSessionRevokeSchema } from '@/lib/validations/admin';
import { apiError } from '@/lib/api-response';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);

    try {
      requireCsrfCheck(request);
    } catch (csrfErr: any) {
      return apiError(csrfErr.message || 'CSRF validation failed', 'CSRF_ERROR', 403);
    }

    const rate = await adminRateLimiter.check(request, 15);
    if (!rate.success) return apiError('Too many attempts. Try again later.', 'RATE_LIMITED', 429);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 'INVALID_JSON', 400);
    }

    const parseResult = adminSessionRevokeSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError('Invalid session revoke payload', 'INVALID_INPUT', 400);
    }

    const { sessionId, revokeAllOthers } = parseResult.data;
    const currentSessionToken =
      request.cookies.get('admin_session_token')?.value || auth.sessionToken || '';

    await connectDB();

    if (revokeAllOthers) {
      const revokedCount = await revokeAllOtherAdminSessions(auth.adminId, currentSessionToken);

      void writeAuditLogFromRequest(request, {
        adminId: auth.adminId,
        targetResourceId: auth.adminId,
        action: AUDIT_ACTIONS.SESSION_REVOKE_ALL,
        category: AUDIT_CATEGORY.SECURITY,
        details: `Admin revoked all other sessions (${revokedCount} sessions terminated).`,
        metadata: { revokedCount },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully revoked ${revokedCount} other active session(s).`,
        revokedCount,
      });
    }

    if (sessionId) {
      const revoked = await revokeAdminSession(sessionId, 'Revoked by admin from session panel');

      void writeAuditLogFromRequest(request, {
        adminId: auth.adminId,
        targetResourceId: sessionId,
        action: AUDIT_ACTIONS.SESSION_REVOKE,
        category: AUDIT_CATEGORY.SECURITY,
        details: `Admin revoked session ${sessionId}.`,
        metadata: { sessionId },
        success: revoked,
      });

      return NextResponse.json({
        success: true,
        message: 'Session has been revoked.',
      });
    }

    return apiError('Specify a sessionId or revokeAllOthers', 'MISSING_PARAM', 400);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('Revoke session error:', error);
    return apiError('Failed to revoke session', 'INTERNAL_ERROR', 500);
  }
}
