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
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await initAdmin();
    requireAdmin(request);

    const userId = params.id;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get user details
    const user = await User.findById(userIdObj)
      .select('email username passwordHash createdAt timeZone notificationPreferences')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user habits
    const habits = await Habit.find({ userId: userIdObj })
      .select('name category type steps order createdAt')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Get daily logs with completion stats
    const logs = await DailyLog.find({ userId: userIdObj })
      .sort({ date: -1 })
      .limit(100)
      .lean();

    // Calculate statistics
    const totalLogs = await DailyLog.countDocuments({ userId: userIdObj });
    const completedLogs = await DailyLog.countDocuments({ userId: userIdObj, completed: true });
    const completionRate = totalLogs > 0 ? (completedLogs / totalLogs) * 100 : 0;

    // Get streaks
    const habitStreaks: Record<string, { current: number; longest: number }> = {};
    
    for (const habit of habits) {
      const habitLogs = await DailyLog.find({ userId: userIdObj, habitId: habit._id })
        .sort({ date: -1 })
        .lean();
      
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < habitLogs.length; i++) {
        const log = habitLogs[i];
        if (log.completed) {
          if (i === 0 && log.date === today) {
            currentStreak = 1;
            tempStreak = 1;
          } else if (i > 0) {
            const prevDate = new Date(habitLogs[i - 1].date);
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
    const activityByDate = await DailyLog.aggregate([
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
        id: user._id.toString(),
        email: user.email,
        username: user.username || 'N/A',
        createdAt: user.createdAt,
        timeZone: user.timeZone,
        passwordHash: user.passwordHash, // Secured - this is hashed, not plain text
        notificationPreferences: user.notificationPreferences,
      },
      habits: habits.map(h => ({
        id: h._id.toString(),
        name: h.name,
        category: h.category,
        type: h.type,
        steps: h.steps,
        order: h.order,
        createdAt: h.createdAt,
        streak: habitStreaks[h._id.toString()] || { current: 0, longest: 0 },
      })),
      logs: logs.map(l => ({
        id: l._id.toString(),
        habitId: l.habitId.toString(),
        date: l.date,
        completed: l.completed,
        stepIndex: l.stepIndex,
        completedAt: l.completedAt,
      })),
      statistics: {
        totalHabits: habits.length,
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

