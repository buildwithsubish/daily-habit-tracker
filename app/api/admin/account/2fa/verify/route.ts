import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { requireAdmin, adminRateLimiter, requireCsrfCheck } from '@/lib/admin-middleware';
import { verify2FACode } from '@/lib/admin-auth';
import { adminTwoFactorSetupSchema } from '@/lib/validations/admin';
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

    const rate = await adminRateLimiter.check(request, 10);
    if (!rate.success) return apiError('Too many attempts. Try again later.', 'RATE_LIMITED', 429);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 'INVALID_JSON', 400);
    }

    const parseResult = adminTwoFactorSetupSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        parseResult.error.issues[0]?.message || 'Invalid 2FA setup verification code',
        'INVALID_INPUT',
        400
      );
    }

    const { code, secret } = parseResult.data;
    const backupCodes = Array.isArray((body as any).backupCodes)
      ? (body as any).backupCodes.map((c: unknown) => String(c).trim()).filter(Boolean)
      : [];

    const isValid = verify2FACode(secret, code);
    if (!isValid) {
      return apiError(
        'Invalid verification code. Please check your authenticator clock and try again.',
        'INVALID_2FA_CODE',
        400
      );
    }

    await connectDB();
    const admin = await Admin.findById(auth.adminId);
    if (!admin) return apiError('Admin not found', 'NOT_FOUND', 404);

    admin.twoFactorEnabled = true;
    admin.twoFactorSecret = secret;
    if (backupCodes.length > 0) {
      admin.twoFactorBackupCodes = backupCodes;
    }
    await admin.save();

    void writeAuditLogFromRequest(request, {
      adminId: admin._id.toString(),
      targetResourceId: admin._id.toString(),
      action: AUDIT_ACTIONS.TWO_FACTOR_VERIFIED,
      category: AUDIT_CATEGORY.SECURITY,
      details: 'Two-factor authentication successfully verified and enabled.',
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been enabled successfully.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('2FA verification error:', error);
    return apiError('Failed to verify 2FA code', 'INTERNAL_ERROR', 500);
  }
}
