import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { generateAdminToken, generateAdminRefreshToken, verify2FACode } from '@/lib/admin-auth';
import { verifyPasswordConstantTime } from '@/lib/password-policy';
import { adminLoginSchema } from '@/lib/validations/admin';
import { adminAccountExists } from '@/lib/admin-bootstrap';
import { writeAuditLogFromRequest, getClientIp } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';
import { apiError } from '@/lib/api-response';
import { adminRateLimiter } from '@/lib/admin-middleware';
import { createAdminSession } from '@/lib/admin-session-service';
import { attachCsrfCookie } from '@/lib/csrf';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting: limit to maximum 5 attempts per 15-minute window per IP
    const rate = await adminRateLimiter.check(request, 5);
    if (!rate.success) {
      return apiError(
        'Too many sign-in attempts. Please try again in 15 minutes.',
        'RATE_LIMITED',
        429
      );
    }

    // 2. Schema validation using Zod
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return apiError('Invalid request format', 'INVALID_JSON', 400);
    }

    const parseResult = adminLoginSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid input';
      return apiError(firstError, 'INVALID_INPUT', 400);
    }

    const { email: rawEmail, password, twoFactorCode } = parseResult.data;
    const email = rawEmail.toLowerCase().trim();
    const clientIP = getClientIp(request);

    await connectDB();

    if (!(await adminAccountExists())) {
      return apiError(
        'Admin not configured. Complete setup at /admin/setup',
        'NEEDS_SETUP',
        503
      );
    }

    // 3. Constant-time query & password verification to prevent email enumeration timing attacks
    const admin = await Admin.findOne({ email });

    // Verify password in constant time regardless of whether admin exists
    const isValidPassword = await verifyPasswordConstantTime(
      password,
      admin ? admin.passwordHash : null
    );

    // If admin doesn't exist or is deactivated, record audit log and return generic "Invalid credentials"
    if (!admin || !admin.isActive) {
      void writeAuditLogFromRequest(request, {
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Failed login attempt — account not found or inactive',
        metadata: { email, reason: 'Invalid credentials' },
        success: false,
        errorMessage: 'Invalid credentials',
      });

      return apiError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    // 4. Lockout check
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const lockTime = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 1000 / 60);

      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        targetResourceId: admin._id.toString(),
        action: AUDIT_ACTIONS.LOGIN_BLOCKED,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Login blocked — account locked',
        metadata: { email, lockTimeRemaining: lockTime },
        success: false,
      });

      return apiError(
        `Account temporarily locked due to multiple failed attempts. Try again in ${lockTime} minutes.`,
        'ACCOUNT_LOCKED',
        423
      );
    }

    // 5. IP Allowlist check if configured
    if (!admin.isIPAllowed(clientIP)) {
      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        targetResourceId: admin._id.toString(),
        action: AUDIT_ACTIONS.LOGIN_BLOCKED_IP,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: `Login blocked — IP not allowed: ${clientIP}`,
        metadata: { email, allowedIPs: admin.allowedIPs },
        success: false,
        errorMessage: 'IP address not allowed',
      });

      return apiError('Access denied from this IP address', 'IP_NOT_ALLOWED', 403);
    }

    // 6. Check password validity
    if (!isValidPassword) {
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout cooldown
        admin.loginAttempts = 0;
      }
      await admin.save();

      void writeAuditLogFromRequest(request, {
        adminId: admin._id.toString(),
        targetResourceId: admin._id.toString(),
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Failed login attempt — invalid credentials',
        metadata: { email, attempts: admin.loginAttempts },
        success: false,
        errorMessage: 'Invalid credentials',
      });

      return apiError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    // 7. Multi-Factor Authentication (MFA / 2FA) Enforcement
    if (admin.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          {
            success: true,
            requiresTwoFactor: true,
            message: 'Please enter your 6-digit authenticator code to complete login',
          },
          { status: 200 }
        );
      }

      const is2FAValid =
        Boolean(admin.twoFactorSecret) &&
        verify2FACode(admin.twoFactorSecret || '', twoFactorCode);

      // Check backup codes if regular TOTP fails
      let usedBackupCode = false;
      if (!is2FAValid && admin.twoFactorBackupCodes && admin.twoFactorBackupCodes.length > 0) {
        const backupIndex = admin.twoFactorBackupCodes.indexOf(twoFactorCode);
        if (backupIndex !== -1) {
          usedBackupCode = true;
          // Consume the single-use backup code
          admin.twoFactorBackupCodes.splice(backupIndex, 1);
          await admin.save();
        }
      }

      if (!is2FAValid && !usedBackupCode) {
        admin.loginAttempts = (admin.loginAttempts || 0) + 1;
        if (admin.loginAttempts >= 5) {
          admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          admin.loginAttempts = 0;
        }
        await admin.save();

        void writeAuditLogFromRequest(request, {
          adminId: admin._id.toString(),
          targetResourceId: admin._id.toString(),
          action: AUDIT_ACTIONS.LOGIN_FAILED_2FA,
          category: AUDIT_CATEGORY.ADMIN_AUTH,
          details: 'Failed login attempt — invalid 2FA code',
          metadata: { email },
          success: false,
          errorMessage: 'Invalid 2FA code',
        });

        return apiError('Invalid 2FA code. Please check your authenticator app.', 'INVALID_2FA', 401);
      }
    }

    // 8. Ensure at least one active super_admin exists in the system
    if (admin.role !== 'super_admin') {
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin', isActive: true });
      if (superAdminCount === 0) {
        admin.role = 'super_admin';
        await admin.save();
      }
    }

    // Create Server-Side Session in Database
    const { session, sessionToken } = await createAdminSession(admin._id.toString(), request);

    // 9. Generate Tokens
    const tokenOptions = {
      email: admin.email,
      role: admin.role,
      sessionId: session._id.toString(),
      sessionToken,
      twoFactorVerified: Boolean(admin.twoFactorEnabled && admin.twoFactorSecret),
      passwordResetRequired: admin.needsPasswordReset(),
    };

    const token = generateAdminToken(admin._id.toString(), tokenOptions);
    const refreshToken = generateAdminRefreshToken(admin._id.toString());
    const passwordExpired = admin.needsPasswordReset();

    // Reset login attempts and record login metadata
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    admin.lastLoginIP = clientIP;
    await admin.save();

    // 10. Immutable Audit Logging
    void writeAuditLogFromRequest(request, {
      adminId: admin._id.toString(),
      targetResourceId: admin._id.toString(),
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      category: AUDIT_CATEGORY.ADMIN_AUTH,
      details: 'Successful administrator login',
      metadata: {
        email,
        role: admin.role,
        sessionId: session._id.toString(),
        passwordExpired,
      },
      success: true,
    });

    // 11. Return Response with HttpOnly, Secure, SameSite=Strict cookies
    const response = NextResponse.json(
      {
        success: true,
        adminId: admin._id.toString(),
        role: admin.role,
        ...(passwordExpired
          ? { passwordExpired: true, message: 'Login successful. Please update your password.' }
          : {}),
      },
      { status: 200 }
    );

    // 15-minute access token cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    // Server-side session tracking cookie
    response.cookies.set('admin_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    // Refresh token cookie
    response.cookies.set('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Attach CSRF protection cookie
    attachCsrfCookie(response);

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response;
  } catch (error: unknown) {
    console.error('Admin login error:', error);
    return apiError('An error occurred during sign in', 'LOGIN_INTERNAL_ERROR', 500);
  }
}
