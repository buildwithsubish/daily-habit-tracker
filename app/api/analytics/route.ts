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
    let endDate = getToday();
    
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
    const habitStats = await Promise.all(
      habits.map(async (habit) => {
        const logs = await DailyLog.find({
          userId: userIdObj,
          habitId: habit._id,
          date: { $gte: startDate, $lte: endDate },
        }).lean();
        
        return {
          id: habit._id.toString(),
          name: habit.name,
          category: habit.category,
          totalLogs: logs.length,
          completedLogs: logs.filter(l => l.completed).length,
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
    
    const streakMap = new Map<string, { current: number; longest: number; lastDate: string | null }>();
    
    for (const log of allLogs) {
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
    
    return NextResponse.json({
      completionStats: formattedCompletionStats,
      habitStats,
      streaks: Object.fromEntries(streakMap),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
