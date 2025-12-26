import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { hashAdminPassword, generateResetToken, hashResetToken } from '@/lib/admin-auth';
import { sanitizeInput } from '@/lib/security';

// Generate reset token
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email } = await request.json();
    const sanitizedEmail = sanitizeInput(email || '').toLowerCase();
    
    if (!sanitizedEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const admin = await Admin.findOne({ email: sanitizedEmail });
    
    if (!admin) {
      // Don't reveal if admin exists for security
      return NextResponse.json(
        { success: true, message: 'If the email exists, a reset link has been sent.' },
        { status: 200 }
      );
    }
    
    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashResetToken(resetToken);
    
    // Set token expiry (1 hour)
    admin.resetToken = hashedToken;
    admin.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await admin.save();
    
    // In production, send email with reset token
    // For now, return token (ONLY FOR DEVELOPMENT - REMOVE IN PRODUCTION)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 RESET TOKEN (DEV ONLY):', resetToken);
      return NextResponse.json({
        success: true,
        message: 'Reset token generated',
        resetToken, // REMOVE THIS IN PRODUCTION
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate reset token' },
      { status: 500 }
    );
  }
}

// Verify and reset password
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { resetToken, newPassword } = await request.json();
    
    if (!resetToken || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (newPassword.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters' },
        { status: 400 }
      );
    }
    
    const hashedToken = hashResetToken(resetToken);
    
    const admin = await Admin.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() },
    });
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    // Update password
    admin.passwordHash = await hashAdminPassword(newPassword);
    admin.resetToken = undefined;
    admin.resetTokenExpiry = undefined;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}

