import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAdmin } from '@/lib/admin-middleware';
import { initAdmin } from '@/lib/init-admin';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await initAdmin();
    requireAdmin(request);

    const { id: userId } = await params;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get user details
    const user = await User.findById(userIdObj)
      .select('email username passwordHash createdAt timeZone notificationPreferences')
      .lean();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    type UserLean = { 
      _id: mongoose.Types.ObjectId; 
      email: string; 
      username?: string; 
      passwordHash: string; 
      createdAt: Date; 
      timeZone: string; 
      notificationPreferences: any;
    };
    const typedUser = user as unknown as UserLean;

    // Get user habits
    const habits = await Habit.find({ userId: userIdObj })
      .select('name category type steps order createdAt')
      .sort({ order: 1, createdAt: 1 })
      .lean();
    
    type HabitLean = { _id: mongoose.Types.ObjectId; name: string; category: string; type: string; steps: any[]; order: number; createdAt: Date };
    const typedHabits = habits as unknown as HabitLean[];

    // Get daily logs with completion stats
    const logs = await DailyLog.find({ userId: userIdObj })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    
    type LogLean = { _id: mongoose.Types.ObjectId; habitId: mongoose.Types.ObjectId; date: string; completed: boolean; stepIndex: number | null; completedAt: Date | null };
    const typedLogs = logs as unknown as LogLean[];

    // Calculate statistics
    const totalLogs = await DailyLog.countDocuments({ userId: userIdObj });
    const completedLogs = await DailyLog.countDocuments({ userId: userIdObj, completed: true });
    const completionRate = totalLogs > 0 ? (completedLogs / totalLogs) * 100 : 0;

    // Get streaks
    const habitStreaks: Record<string, { current: number; longest: number }> = {};
    
    for (const habit of typedHabits) {
      const habitLogs = await DailyLog.find({ userId: userIdObj, habitId: habit._id })
        .sort({ date: -1 })
        .lean();
      
      type StreakLogLean = { date: string; completed: boolean };
      const typedHabitLogs = habitLogs as unknown as StreakLogLean[];
      
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < typedHabitLogs.length; i++) {
        const log = typedHabitLogs[i];
        if (log.completed) {
          if (i === 0 && log.date === today) {
            currentStreak = 1;
            tempStreak = 1;
          } else if (i > 0) {
            const prevDate = new Date(typedHabitLogs[i - 1].date);
            const currDate = new Date(log.date);
            const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              tempStreak++;
              if (i === 0) currentStreak = tempStreak;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      habitStreaks[habit._id.toString()] = {
        current: currentStreak,
        longest: longestStreak,
      };
    }

    // Get activity by date
    const activityByDate = await DailyLog.aggregate<{ _id: string; total: number; completed: number }>([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: '$date',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    return NextResponse.json({
      user: {
        id: typedUser._id.toString(),
        email: typedUser.email,
        username: typedUser.username || 'N/A',
        createdAt: typedUser.createdAt,
        timeZone: typedUser.timeZone,
        passwordHash: typedUser.passwordHash, // Secured - this is hashed, not plain text
        notificationPreferences: typedUser.notificationPreferences,
      },
      habits: typedHabits.map(h => ({
        id: h._id.toString(),
        name: h.name,
        category: h.category,
        type: h.type,
        steps: h.steps,
        order: h.order,
        createdAt: h.createdAt,
        streak: habitStreaks[h._id.toString()] || { current: 0, longest: 0 },
      })),
      logs: typedLogs.map(l => ({
        id: l._id.toString(),
        habitId: l.habitId.toString(),
        date: l.date,
        completed: l.completed,
        stepIndex: l.stepIndex,
        completedAt: l.completedAt,
      })),
      statistics: {
        totalHabits: typedHabits.length,
        totalLogs,
        completedLogs,
        completionRate: completionRate.toFixed(1),
        activityByDate: activityByDate.map(a => ({
          date: a._id,
          total: a.total,
          completed: a.completed,
        })),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await initAdmin();
    requireAdmin(request);

    const { id: userId } = await params;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const { preferredTheme } = await request.json();

    if (!preferredTheme) {
      return NextResponse.json(
        { error: 'preferredTheme is required' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userIdObj,
      { preferredTheme },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Theme "${preferredTheme}" assigned to user`,
      user: {
        id: user._id.toString(),
        email: user.email,
        preferredTheme: user.preferredTheme,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
