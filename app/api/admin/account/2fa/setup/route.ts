import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { requireAdmin, adminRateLimiter } from '@/lib/admin-middleware';
import { generate2FASecret } from '@/lib/admin-auth';
import { apiError } from '@/lib/api-response';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';

export const runtime = 'nodejs';

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    const rate = await adminRateLimiter.check(request, 10);
    if (!rate.success) return apiError('Too many attempts. Try again later.', 'RATE_LIMITED', 429);

    await connectDB();
    const admin = await Admin.findById(auth.adminId);
    if (!admin) return apiError('Admin not found', 'NOT_FOUND', 404);

    const secret = generate2FASecret();
    const backupCodes = generateBackupCodes(8);
    const appName = 'DailyHabitTracker';
    const otpauthUri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(
      admin.email
    )}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;

    void writeAuditLogFromRequest(request, {
      adminId: admin._id.toString(),
      targetResourceId: admin._id.toString(),
      action: AUDIT_ACTIONS.TWO_FACTOR_SETUP,
      category: AUDIT_CATEGORY.SECURITY,
      details: 'Admin initiated 2FA setup wizard',
      success: true,
    });

    return NextResponse.json({
      success: true,
      secret,
      otpauthUri,
      backupCodes,
      twoFactorEnabled: admin.twoFactorEnabled,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('2FA setup error:', error);
    return apiError('Failed to initiate 2FA setup', 'INTERNAL_ERROR', 500);
  }
}
