import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import AuditLog from '@/lib/models/AuditLog';
import { verifyAdminPassword, generateAdminToken, generateAdminRefreshToken, verify2FACode, generateResetToken, hashResetToken } from '@/lib/admin-auth';
import { sanitizeInput } from '@/lib/security';
import { initAdmin } from '@/lib/init-admin';
import { autoConnectWhatsApp } from '@/lib/whatsapp-auto-connect';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Initialize admin if not exists
    await initAdmin();
    
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    let { email, password, twoFactorCode } = await request.json();
    
    // Sanitize inputs
    const originalPassword = password;
    email = sanitizeInput(email || '').toLowerCase();
    password = password || '';
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      // Log failed attempt
      await AuditLog.create({
        adminId: null,
        action: 'login_failed',
        category: 'admin_auth',
        details: `Failed login attempt for non-existent email: ${email}`,
        metadata: { email, ip: clientIP, reason: 'User not found' },
        success: false,
        errorMessage: 'Invalid credentials',
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check if account is locked
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const lockTime = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 1000 / 60);
      
      await AuditLog.create({
        adminId: admin._id.toString(),
        action: 'login_blocked',
        category: 'admin_auth',
        details: `Login blocked - account locked`,
        metadata: { email, ip: clientIP, lockTimeRemaining: lockTime },
        success: false,
      });
      
      return NextResponse.json(
        { error: `Account locked. Try again in ${lockTime} minutes.`, code: 'ACCOUNT_LOCKED' },
        { status: 423 }
      );
    }
    
    // Check IP restrictions
    if (!admin.isIPAllowed(clientIP)) {
      await AuditLog.create({
        adminId: admin._id.toString(),
        action: 'login_blocked_ip',
        category: 'admin_auth',
        details: `Login blocked - IP not allowed: ${clientIP}`,
        metadata: { email, ip: clientIP, allowedIPs: admin.allowedIPs },
        success: false,
        errorMessage: 'IP address not allowed',
      });
      
      return NextResponse.json(
        { error: 'Access denied from this IP address', code: 'IP_NOT_ALLOWED' },
        { status: 403 }
      );
    }
    
    const isValid = await verifyAdminPassword(password, admin.passwordHash);
    
    if (!isValid) {
      // Increment login attempts
      admin.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        admin.loginAttempts = 0;
      }
      
      await admin.save();
      
      await AuditLog.create({
        adminId: admin._id.toString(),
        action: 'login_failed',
        category: 'admin_auth',
        details: `Failed login attempt - invalid password`,
        metadata: { email, ip: clientIP, attempts: admin.loginAttempts },
        success: false,
        errorMessage: 'Invalid password',
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
    
    // Check if 2FA is enabled
    if (admin.twoFactorEnabled) {
      // If no 2FA code provided, request it
      if (!twoFactorCode) {
        return NextResponse.json(
          { requiresTwoFactor: true, message: 'Please enter your 2FA code' },
          { status: 200 }
        );
      }
      
      // Verify 2FA code
      const is2FAValid = verify2FACode(admin.twoFactorSecret!, twoFactorCode);
      
      if (!is2FAValid) {
        await AuditLog.create({
          adminId: admin._id.toString(),
          action: 'login_failed_2fa',
          category: 'admin_auth',
          details: `Failed login attempt - invalid 2FA code`,
          metadata: { email, ip: clientIP },
          success: false,
          errorMessage: 'Invalid 2FA code',
        });
        
        return NextResponse.json(
          { error: 'Invalid 2FA code', code: 'INVALID_2FA' },
          { status: 401 }
        );
      }
    }
    
    // Check if password needs reset (older than 90 days)
    if (admin.needsPasswordReset()) {
      // Allow login but warn about password expiration
      const response = NextResponse.json(
        { 
          success: true, 
          adminId: admin._id.toString(),
          passwordExpired: true,
          message: 'Login successful but please update your password' 
        },
        { status: 200 }
      );
      
      // Set token
      const token = generateAdminToken(admin._id.toString(), {
        email: admin.email,
        role: admin.role,
        twoFactorVerified: true,
      });
      
      const refreshToken = generateAdminRefreshToken(admin._id.toString());
      
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
      
      return response;
    }
    
    // Reset login attempts on successful login
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    admin.lastLoginIP = clientIP;
    await admin.save();
    
    // Generate tokens
    const token = generateAdminToken(admin._id.toString(), {
      email: admin.email,
      role: admin.role,
      twoFactorVerified: true,
    });
    
    const refreshToken = generateAdminRefreshToken(admin._id.toString());
    
    // Log successful login
    await AuditLog.create({
      adminId: admin._id.toString(),
      action: 'login_success',
      category: 'admin_auth',
      details: `Successful login`,
      metadata: { email, ip: clientIP, role: admin.role },
      success: true,
    });
    
    const response = NextResponse.json(
      { success: true, adminId: admin._id.toString(), role: admin.role },
      { status: 200 }
    );
    
    // Set cookies
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    response.cookies.set('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    // Auto-connect WhatsApp in background
    autoConnectWhatsApp(admin._id.toString());
    
    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
