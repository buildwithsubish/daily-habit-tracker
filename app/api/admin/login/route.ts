import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { verifyAdminPassword, generateAdminToken, generateAdminRefreshToken, verify2FACode } from '@/lib/admin-auth';
import { sanitizeInput } from '@/lib/security';
import { adminAccountExists } from '@/lib/admin-bootstrap';
import { writeAuditLogFromRequest, getClientIp } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';
import { apiError } from '@/lib/api-response';
import { adminRateLimiter } from '@/lib/admin-middleware';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rate = await adminRateLimiter.check(request, 10);
    if (!rate.success) return apiError('Too many sign-in attempts. Try again later.', 'RATE_LIMITED', 429);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError('Invalid request body', 'INVALID_JSON', 400); }
    if (!body || typeof body !== 'object') return apiError('Invalid request body', 'INVALID_JSON', 400);
    const input = body as Record<string, unknown>;
    const rawEmail = input.email;
    const password = input.password;
    const twoFactorCode = input.twoFactorCode;
    if (typeof rawEmail !== 'string' || typeof password !== 'string' || rawEmail.length > 254 || password.length > 256 ||
      (twoFactorCode !== undefined && (typeof twoFactorCode !== 'string' || !/^\d{6}$/.test(twoFactorCode)))) {
      return apiError('Enter valid sign-in details.', 'INVALID_INPUT', 400);
    }
    await connectDB();

    if (!(await adminAccountExists())) {
      return apiError(
        'Admin not configured. Complete setup at /admin/setup',
        'NEEDS_SETUP',
        503
      );
    }


    const clientIP = getClientIp(request);

    const email = sanitizeInput(rawEmail).toLowerCase();

    if (!email || !password) {
      return apiError('Email and password are required', 'MISSING_CREDENTIALS', 400);
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      void writeAuditLogFromRequest(request, {
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Failed login attempt for non-existent email',
        metadata: { email, reason: 'User not found' },
        success: false,
        errorMessage: 'Invalid credentials',
      });

      return apiError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const lockTime = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 1000 / 60);

      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        action: AUDIT_ACTIONS.LOGIN_BLOCKED,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Login blocked — account locked',
        metadata: { email, lockTimeRemaining: lockTime },
        success: false,
      });

      return apiError(
        `Account locked. Try again in ${lockTime} minutes.`,
        'ACCOUNT_LOCKED',
        423
      );
    }

    if (!admin.isIPAllowed(clientIP)) {
      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        action: AUDIT_ACTIONS.LOGIN_BLOCKED_IP,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: `Login blocked — IP not allowed: ${clientIP}`,
        metadata: { email, allowedIPs: admin.allowedIPs },
        success: false,
        errorMessage: 'IP address not allowed',
      });

      return apiError('Access denied from this IP address', 'IP_NOT_ALLOWED', 403);
    }

    const isValid = await verifyAdminPassword(password, admin.passwordHash);

    if (!isValid) {
      admin.loginAttempts += 1;

      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        admin.loginAttempts = 0;
      }

      await admin.save();

      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Failed login attempt — invalid password',
        metadata: { email, attempts: admin.loginAttempts },
        success: false,
        errorMessage: 'Invalid password',
      });

      return apiError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    if (admin.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          { success: true, requiresTwoFactor: true, message: 'Please enter your 2FA code' },
          { status: 200 }
        );
      }

      const is2FAValid = Boolean(admin.twoFactorSecret) && verify2FACode(admin.twoFactorSecret || '', twoFactorCode as string);

      if (!is2FAValid) {
        admin.loginAttempts += 1;
        if (admin.loginAttempts >= 5) {
          admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
          admin.loginAttempts = 0;
        }
        await admin.save();
        void writeAuditLogFromRequest(request, {
          adminId: admin._id.toString(),
          action: AUDIT_ACTIONS.LOGIN_FAILED_2FA,
          category: AUDIT_CATEGORY.ADMIN_AUTH,
          details: 'Failed login attempt — invalid 2FA code',
          metadata: { email },
          success: false,
          errorMessage: 'Invalid 2FA code',
        });

        return apiError('Invalid 2FA code', 'INVALID_2FA', 401);
      }
    }

    const tokenOptions = {
      email: admin.email,
      role: admin.role as 'admin' | 'super_admin',
      twoFactorVerified: Boolean(admin.twoFactorEnabled && admin.twoFactorSecret),
      passwordResetRequired: admin.needsPasswordReset(),
    };

    const token = generateAdminToken(admin._id.toString(), tokenOptions);
    const refreshToken = generateAdminRefreshToken(admin._id.toString());

    const passwordExpired = admin.needsPasswordReset();

    if (!passwordExpired) {
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
      admin.lastLogin = new Date();
      admin.lastLoginIP = clientIP;
      await admin.save();
    }

    void writeAuditLogFromRequest(request, {
      adminId: admin._id.toString(),
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      category: 'admin_auth',
      details: 'Successful login',
      metadata: { email, role: admin.role, passwordExpired },
      success: true,
    });

    const response = NextResponse.json(
      {
        success: true,
        adminId: admin._id.toString(),
        role: admin.role,
        ...(passwordExpired
          ? { passwordExpired: true, message: 'Login successful but please update your password' }
          : {}),
      },
      { status: 200 }
    );

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    response.cookies.set('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });


    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: unknown) {
    console.error('Admin login error:', error);
    return apiError('An error occurred during login', 'LOGIN_INTERNAL_ERROR', 500);
  }
}
