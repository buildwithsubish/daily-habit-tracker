import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { requireAdmin, adminRateLimiter, createAdminTokenResponse } from '@/lib/admin-middleware';
import { hashAdminPassword, verifyAdminPassword } from '@/lib/admin-auth';
import { isStrongPassword } from '@/lib/security';
import { apiError } from '@/lib/api-response';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_CATEGORY } from '@/lib/audit-log-constants';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== request.nextUrl.host) return apiError('Cross-origin request rejected', 'INVALID_ORIGIN', 403);
      } catch {
        return apiError('Invalid request origin', 'INVALID_ORIGIN', 403);
      }
    }

    const auth = requireAdmin(request);
    const rate = await adminRateLimiter.check(request, 5);
    if (!rate.success) return apiError('Too many password attempts. Try again later.', 'RATE_LIMITED', 429);

    let body: unknown;
    try { body = await request.json(); }
    catch { return apiError('Invalid request body', 'INVALID_JSON', 400); }
    if (!body || typeof body !== 'object') return apiError('Invalid request body', 'INVALID_JSON', 400);

    const { currentPassword, newPassword, confirmPassword } = body as Record<string, unknown>;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || typeof confirmPassword !== 'string' ||
      currentPassword.length > 256 || newPassword.length > 256 || confirmPassword.length > 256) {
      return apiError('Enter your current password and a valid new password.', 'INVALID_INPUT', 400);
    }
    if (!isStrongPassword(newPassword)) return apiError('Use at least 8 characters with uppercase, lowercase and a number.', 'WEAK_PASSWORD', 400);
    if (newPassword !== confirmPassword) return apiError('New passwords do not match.', 'PASSWORD_MISMATCH', 400);
    if (currentPassword === newPassword) return apiError('Choose a password different from your current one.', 'PASSWORD_UNCHANGED', 400);

    await connectDB();
    const admin = await Admin.findById(auth.adminId);
    if (!admin) return apiError('Admin account not found.', 'ADMIN_NOT_FOUND', 404);
    if (!(await verifyAdminPassword(currentPassword, admin.passwordHash))) {
      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        action: 'admin_password_change_failed',
        category: AUDIT_CATEGORY.SECURITY,
        details: 'In-session password change rejected because the current password was incorrect.',
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
      action: 'admin_password_changed',
      category: AUDIT_CATEGORY.SECURITY,
      details: 'Admin password changed from the authenticated settings page.',
      success: true,
    });

    const response = createAdminTokenResponse(admin._id.toString(), {
      email: admin.email,
      role: admin.role,
      twoFactorVerified: Boolean(admin.twoFactorEnabled && auth.twoFactorVerified),
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password update failed';
    return apiError(message === 'Unauthorized' ? 'Authentication required.' : 'Password update failed.', 'PASSWORD_UPDATE_FAILED', message === 'Unauthorized' ? 401 : 500);
  }
}
