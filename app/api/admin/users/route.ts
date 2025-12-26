import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAdmin } from '@/lib/admin-middleware';
import { initAdmin } from '@/lib/init-admin';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    await initAdmin();
    requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('email username createdAt timeZone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userId = new mongoose.Types.ObjectId(user._id);
        
        const [habitCount, logCount, completedLogs] = await Promise.all([
          Habit.countDocuments({ userId }),
          DailyLog.countDocuments({ userId }),
          DailyLog.countDocuments({ userId, completed: true }),
        ]);

        const lastActivity = await DailyLog.findOne({ userId })
          .sort({ date: -1 })
          .select('date')
          .lean();

        return {
          id: user._id.toString(),
          email: user.email,
          username: user.username || 'N/A',
          createdAt: user.createdAt,
          timeZone: user.timeZone,
          stats: {
            habitCount,
            logCount,
            completedLogs,
            completionRate: logCount > 0 ? ((completedLogs / logCount) * 100).toFixed(1) : '0',
            lastActivity: lastActivity?.date || null,
          },
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

