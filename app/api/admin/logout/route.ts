import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-middleware';
import connectDB from '@/lib/mongodb';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';
import { revokeAdminSession } from '@/lib/admin-session-service';
import { CSRF_COOKIE_NAME } from '@/lib/csrf';

export const runtime = 'nodejs';

function clearAdminCookies(response: NextResponse): NextResponse {
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/',
  };
  response.cookies.set('admin_token', '', cookieOpts);
  response.cookies.set('admin_refresh_token', '', cookieOpts);
  response.cookies.set('admin_session_token', '', cookieOpts);
  response.cookies.set(CSRF_COOKIE_NAME, '', { ...cookieOpts, httpOnly: false });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const admin = getAdminFromRequest(request);
    const sessionToken = request.cookies.get('admin_session_token')?.value || admin?.sessionToken;

    if (sessionToken) {
      await revokeAdminSession(sessionToken, 'Admin logged out explicitly');
    }

    if (admin?.adminId) {
      void writeAuditLogFromRequest(request, {
        adminId: admin.adminId,
        targetResourceId: admin.adminId,
        action: AUDIT_ACTIONS.LOGOUT,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Admin logged out successfully',
        success: true,
      });
    }

    return clearAdminCookies(NextResponse.json({ success: true, message: 'Logged out successfully' }));
  } catch (error: unknown) {
    console.error('Admin logout error:', error);
    return clearAdminCookies(NextResponse.json({ success: true }));
  }
}
