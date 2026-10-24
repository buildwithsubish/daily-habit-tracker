import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { requireAdmin, adminRateLimiter, createAdminTokenResponse, requireCsrfCheck } from '@/lib/admin-middleware';
import { hashAdminPassword, verifyAdminPassword } from '@/lib/admin-auth';
import { adminPasswordChangeSchema } from '@/lib/validations/admin';
import { apiError } from '@/lib/api-response';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);

    // CSRF check on state-changing request
    try {
      requireCsrfCheck(request);
    } catch (csrfErr: any) {
      return apiError(csrfErr.message || 'CSRF validation failed', 'CSRF_ERROR', 403);
    }

    const rate = await adminRateLimiter.check(request, 5);
    if (!rate.success) return apiError('Too many password attempts. Try again later.', 'RATE_LIMITED', 429);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 'INVALID_JSON', 400);
    }

    const parseResult = adminPasswordChangeSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.issues[0]?.message || 'Invalid password payload';
      return apiError(msg, 'INVALID_PASSWORD', 400);
    }

    const { currentPassword, newPassword } = parseResult.data;

    if (currentPassword === newPassword) {
      return apiError('Choose a new password different from your current one.', 'PASSWORD_UNCHANGED', 400);
    }

    await connectDB();
    const admin = await Admin.findById(auth.adminId);
    if (!admin) return apiError('Admin account not found.', 'ADMIN_NOT_FOUND', 404);

    if (!(await verifyAdminPassword(currentPassword, admin.passwordHash))) {
      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        targetResourceId: admin._id.toString(),
        action: 'admin_password_change_failed',
        category: AUDIT_CATEGORY.SECURITY,
        details: 'Password change rejected because the current password was incorrect.',
        success: false,
      });
      return apiError('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD', 401);
    }

    admin.passwordHash = await hashAdminPassword(newPassword);
    admin.passwordChangedAt = new Date();
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();

    void writeAuditLogFromRequest(request, {
      adminId: admin._id.toString(),
      targetResourceId: admin._id.toString(),
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      category: AUDIT_CATEGORY.SECURITY,
      details: 'Administrator successfully changed password adhering to 14+ character policy.',
      success: true,
    });

    return createAdminTokenResponse(admin._id.toString(), {
      email: admin.email,
      role: admin.role,
      twoFactorVerified: Boolean(admin.twoFactorEnabled && admin.twoFactorSecret),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('Password change error:', error);
    return apiError('Failed to change password', 'INTERNAL_ERROR', 500);
  }
}
