import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { verifyAdminPassword, generateAdminToken } from '@/lib/admin-auth';
import { sanitizeInput } from '@/lib/security';
import { initAdmin } from '@/lib/init-admin';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    // Initialize admin if not exists
    await initAdmin();
    
    let { email, password } = await request.json();
    
    // Sanitize inputs
    email = sanitizeInput(email || '').toLowerCase();
    password = sanitizeInput(password || '');
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const lockTime = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { error: `Account locked. Try again in ${lockTime} minutes.` },
        { status: 423 }
      );
    }

    const isValid = await verifyAdminPassword(password, admin.passwordHash);
    
    if (!isValid) {
      // Increment login attempts
      admin.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        admin.loginAttempts = 0;
      }
      
      await admin.save();
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset login attempts on successful login
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();
    
    const token = generateAdminToken(admin._id.toString());
    
    const response = NextResponse.json(
      { success: true, adminId: admin._id.toString() },
      { status: 200 }
    );
    
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}

