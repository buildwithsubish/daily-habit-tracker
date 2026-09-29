import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-middleware';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    
    if (!admin) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    await connectDB();
    const account = await Admin.findById(admin.adminId).select('twoFactorEnabled passwordChangedAt').lean().exec() as { twoFactorEnabled?: boolean; passwordChangedAt?: Date | null } | null;
    if (!account) return NextResponse.json({ authenticated: false }, { status: 401 });
    
    const response = NextResponse.json({
      authenticated: true,
      adminId: admin.adminId,
      email: admin.email,
      role: admin.role,
      twoFactorVerified: admin.twoFactorVerified,
      twoFactorEnabled: Boolean(account.twoFactorEnabled),
      passwordChangedAt: account.passwordChangedAt || null,
      passwordResetRequired: !account.passwordChangedAt || new Date(account.passwordChangedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}
