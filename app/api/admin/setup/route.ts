import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import {
  getAdminSetupStatus,
  performAdminSetup,
} from '@/lib/admin-setup-service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getClientIp, getClientUserAgent } from '@/lib/audit-log';
import { adminRateLimiter } from '@/lib/admin-middleware';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectDB();
    const status = await getAdminSetupStatus();
    return apiSuccess(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Setup status check failed';
    return apiError(message, 'SETUP_STATUS_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = await adminRateLimiter.check(request, 5);
    if (!rate.success) {
      return apiError('Too many setup attempts. Try again later.', 'RATE_LIMITED', 429);
    }

    await connectDB();

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 'INVALID_JSON', 400);
    }

    const result = await performAdminSetup(
      {
        email: String(body.email || ''),
        password: String(body.password || ''),
        setupToken: body.setupToken ? String(body.setupToken) : undefined,
      },
      {
        ipAddress: ip,
        userAgent: getClientUserAgent(request),
      }
    );

    if (!result.ok) {
      return apiError(result.message, result.errorCode, result.status, result.details);
    }

    return apiSuccess(
      {
        adminId: result.adminId,
        email: result.email,
      },
      {
        message: 'Admin account created. You can now log in.',
        status: 201,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create admin account';
    return apiError(message, 'SETUP_INTERNAL_ERROR', 500);
  }
}