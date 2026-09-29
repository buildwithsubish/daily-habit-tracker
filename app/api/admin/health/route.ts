import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireAdmin } from '@/lib/admin-middleware';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    await connectDB();

    const totalUsers = await User.countDocuments();
    const memoryUsage = process.memoryUsage();
    const encryptionOk = Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32);
    const checklist = [
      { id: 'admin', label: 'Admin account', done: true, hint: 'Stored in MongoDB (not .env)' },
      { id: 'database', label: 'Database connected', done: true, hint: 'Database connection is active' },
      { id: 'encryption', label: 'Encryption key configured', done: encryptionOk, hint: 'Set ENCRYPTION_KEY (min 32 characters)' },
    ];

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      database: { totalUsers, health: 'connected' },
      onboarding: {
        complete: checklist.every(item => item.done),
        checklist,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Health Check] Error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed',
    }, { status: 500 });
  }
}
