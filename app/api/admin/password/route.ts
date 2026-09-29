import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { resetAdminPassword } from '@/lib/admin-setup-service';
import { validateAdminSetupInput } from '@/lib/admin-setup-validation';
import { apiError, apiSuccess } from '@/lib/api-response';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_CATEGORY } from '@/lib/audit-log-constants';
import { adminRateLimiter } from '@/lib/admin-middleware';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rate = await adminRateLimiter.check(request, 5);
    if (!rate.success) {
      return apiError('Too many attempts. Try again later.', 'RATE_LIMITED', 429);
    }

    await connectDB();

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 'INVALID_JSON', 400);
    }

    const validation = validateAdminSetupInput(
      {
        email: String(body.email || ''),
        password: String(body.password || ''),
        confirmPassword: String(body.confirmPassword || body.password || ''),
        setupToken: String(body.setupToken || ''),
      },
      { requireSetupToken: true }
    );

    if (!validation.valid || !validation.normalized) {
      return apiError('Invalid input', 'VALIDATION_ERROR', 400, validation.errors);
    }

    const result = await resetAdminPassword(
      validation.normalized.email,
      validation.normalized.password,
      validation.normalized.setupToken || ''
    );

    if (!result.ok) {
      void writeAuditLogFromRequest(request, {
        action: 'admin_password_reset_failed',
        category: AUDIT_CATEGORY.SECURITY,
        details: 'Password update failed',
        metadata: { reason: result.message },
        success: false,
        errorMessage: result.message,
      });
      return apiError(result.message, 'PASSWORD_UPDATE_FAILED', 400);
    }

    return apiSuccess(
      {},
      { message: 'Password updated successfully. You can sign in now.', status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Password update failed';
    return apiError(message, 'PASSWORD_INTERNAL_ERROR', 500);
  }
}