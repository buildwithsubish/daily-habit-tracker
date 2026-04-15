import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyLog from '@/lib/models/DailyLog';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import { getDaysAgo, getToday } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // weekly, monthly, yearly
    const days = parseInt(searchParams.get('days') || '30');

    let startDate: string;
    const endDate = getToday();

    if (period === 'weekly') {
      startDate = getDaysAgo(7);
    } else if (period === 'monthly') {
      startDate = getDaysAgo(30);
    } else if (period === 'yearly') {
      startDate = getDaysAgo(365);
    } else {
      startDate = getDaysAgo(days);
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get completion stats
    const completionStats = await DailyLog.aggregate([
      {
        $match: {
          userId: userIdObj,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$date',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedCompletionStats = completionStats.map(stat => ({
      date: stat._id,
      total: stat.total,
      completed: stat.completed,
    }));

    // Get habit-wise stats
    const habits = await Habit.find({ userId: userIdObj }).lean();

    type HabitLean = {
      _id: mongoose.Types.ObjectId;
      name: string;
      category: string;
    };
    const typedHabits = habits as unknown as HabitLean[];

    const habitStats = await Promise.all(
      typedHabits.map(async (habit) => {
        const logs = await DailyLog.find({
          userId: userIdObj,
          habitId: habit._id,
          date: { $gte: startDate, $lte: endDate },
        }).lean();

        type LogLean = { completed: boolean };
        const typedLogs = logs as unknown as LogLean[];

        return {
          id: habit._id.toString(),
          name: habit.name,
          category: habit.category,
          totalLogs: typedLogs.length,
          completedLogs: typedLogs.filter(l => l.completed).length,
        };
      })
    );

    // Calculate streaks
    const allLogs = await DailyLog.find({
      userId: userIdObj,
      date: { $gte: getDaysAgo(90) },
    })
      .sort({ habitId: 1, date: -1 })
      .lean();

    type StreakLogLean = { habitId: mongoose.Types.ObjectId; date: string; completed: boolean };
    const typedAllLogs = allLogs as unknown as StreakLogLean[];

    const streakMap = new Map<string, { current: number; longest: number; lastDate: string | null }>();

    for (const log of typedAllLogs) {
      const habitId = log.habitId.toString();
      if (!streakMap.has(habitId)) {
        streakMap.set(habitId, { current: 0, longest: 0, lastDate: null });
      }

      const streak = streakMap.get(habitId)!;
      if (log.completed) {
        if (!streak.lastDate) {
          streak.current = 1;
          streak.lastDate = log.date;
        } else {
          const lastDate = new Date(streak.lastDate);
          const currentDate = new Date(log.date);
          const diffDays = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            streak.current++;
            streak.lastDate = log.date;
          } else if (diffDays > 1) {
            streak.longest = Math.max(streak.longest, streak.current);
            streak.current = 1;
            streak.lastDate = log.date;
          }
        }
        streak.longest = Math.max(streak.longest, streak.current);
      }
    }

    // Generate heatmap data (last 365 days)
    const heatmapStart = new Date();
    heatmapStart.setDate(heatmapStart.getDate() - 365);
    const heatmapLogs = await DailyLog.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: heatmapStart.toISOString().split('T')[0] },
      completed: true,
    }).lean();

    const heatmap: Record<string, number> = {};
    (heatmapLogs as any[]).forEach((log) => {
      const d = log.date;
      heatmap[d] = (heatmap[d] || 0) + 1;
    });

    // Trend: week-over-week growth
    const recent7 = formattedCompletionStats.slice(-7);
    const prev7 = formattedCompletionStats.slice(-14, -7);
    const r7 = recent7.reduce((a: number, s: any) => a + (s.total > 0 ? s.completed / s.total : 0), 0) / Math.max(recent7.length, 1);
    const p7 = prev7.reduce((a: number, s: any) => a + (s.total > 0 ? s.completed / s.total : 0), 0) / Math.max(prev7.length, 1);
    const trendPct = p7 > 0 ? Math.round(((r7 - p7) / p7) * 100) : 0;

    return NextResponse.json({
      completionStats: formattedCompletionStats,
      habitStats,
      streaks: Object.fromEntries(streakMap),
      heatmap,
      trend: { thisWeekRate: Math.round(r7 * 100), prevWeekRate: Math.round(p7 * 100), changePercent: trendPct },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
