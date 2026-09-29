import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import User from '@/lib/models/User';
import { verifyAdminPassword } from '@/lib/admin-auth';
import { requireAdmin } from '@/lib/admin-middleware';
import { maskEmail, maskUsername } from '@/lib/pii';

export async function POST(request: NextRequest) {
  try {
    // Verify admin is logged in
    const admin = requireAdmin(request);
    await connectDB();

    const { adminPassword, userId } = await request.json();

    if (!adminPassword || !userId) {
      return NextResponse.json(
        { error: 'Admin password and user ID are required' },
        { status: 400 }
      );
    }

    // Get admin from database
    const adminDoc = await Admin.findById(admin.adminId);
    if (!adminDoc) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 401 }
      );
    }

    // Verify admin password
    const isValidPassword = await verifyAdminPassword(adminPassword, adminDoc.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Get user (but we can't decrypt password since it's hashed)
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user info without password (passwords are hashed and can't be decrypted)
    return NextResponse.json({
      success: true,
      message: 'Passwords are securely hashed and cannot be decrypted. This is for security purposes.',
      user: {
        _id: user._id,
        email: maskEmail(user.email),
        username: maskUsername(user.username),
        createdAt: user.createdAt,
        note: 'Password hashes cannot be decrypted. If user forgot password, use reset functionality instead.'
      }
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Decrypt password error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
