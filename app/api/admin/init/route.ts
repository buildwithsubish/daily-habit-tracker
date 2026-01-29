import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { hashAdminPassword } from '@/lib/admin-auth';

export async function POST() {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@habittracker.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD environment variable not set' },
        { status: 400 }
      );
    }

    console.log(`🔧 Initializing admin with email: ${adminEmail}`);

    // Delete existing admin if exists to force fresh hash
    const existing = await Admin.findOne({ email: adminEmail });
    if (existing) {
      await Admin.deleteOne({ email: adminEmail });
      console.log(`🗑️  Deleted existing admin record`);
    }

    // Create new admin account with fresh password hash
    const passwordHash = await hashAdminPassword(adminPassword);
    console.log(`🔐 Password hash generated: ${passwordHash.substring(0, 20)}...`);

    const admin = await Admin.create({
      email: adminEmail,
      passwordHash,
      loginAttempts: 0,
      lockUntil: null,
    });

    console.log(`✅ Admin account initialized successfully`);
    console.log(`📧 Email: ${adminEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Admin account initialized successfully',
      admin: {
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to initialize admin:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize admin' },
      { status: 500 }
    );
  }
}
