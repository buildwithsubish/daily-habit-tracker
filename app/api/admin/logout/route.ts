import { NextRequest, NextResponse } from 'next/server';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import connectDB from '@/lib/mongodb';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';

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
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);

    if (adminId) {
      void writeAuditLogFromRequest(request, {
        adminId,
        action: AUDIT_ACTIONS.LOGOUT,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Admin logged out',
        success: true,
      });
    }

    return clearAdminCookies(NextResponse.json({ success: true }));
  } catch (error: unknown) {
    console.error('Admin logout error:', error);
    return clearAdminCookies(NextResponse.json({ success: true }));
  }
}