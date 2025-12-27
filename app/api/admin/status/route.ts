import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@habittracker.com';
    const admin = await Admin.findOne({ email: adminEmail });

    if (!admin) {
      return NextResponse.json({
        exists: false,
        message: 'Admin not found in database',
        expectedEmail: adminEmail,
      });
    }

    return NextResponse.json({
      exists: true,
      email: admin.email,
      passwordHashPreview: admin.passwordHash?.substring(0, 30) + '...',
      loginAttempts: admin.loginAttempts,
      lockUntil: admin.lockUntil,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
