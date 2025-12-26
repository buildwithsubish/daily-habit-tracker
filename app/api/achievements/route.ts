import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAuth } from '@/lib/middleware';
import { getToday, getDaysAgo } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get user's habits
    const habits = await Habit.find({ userId: userIdObj }).lean();
    const totalHabits = habits.length;

    // Get completion data
    const logs = await DailyLog.find({
      userId: userIdObj,
      completed: true,
    })
      .sort({ date: -1 })
      .lean();

    // Calculate streaks
    const dates = [...new Set(logs.map(l => l.date))].sort((a, b) => b.localeCompare(a));
    let currentStreak = 0;
    const today = getToday();
    
    if (dates.length > 0 && dates[0] === today) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    const achievements = [
      {
        id: 'first-habit',
        name: 'Getting Started',
        description: 'Create your first habit',
        icon: 'star',
        unlocked: totalHabits >= 1,
        progress: Math.min(totalHabits, 1),
        maxProgress: 1,
      },
      {
        id: 'week-streak',
        name: 'Week Warrior',
        description: 'Complete habits for 7 days straight',
        icon: 'flame',
        unlocked: currentStreak >= 7,
        progress: Math.min(currentStreak, 7),
        maxProgress: 7,
      },
      {
        id: 'month-streak',
        name: 'Monthly Master',
        description: 'Complete habits for 30 days straight',
        icon: 'trophy',
        unlocked: currentStreak >= 30,
        progress: Math.min(currentStreak, 30),
        maxProgress: 30,
      },
      {
        id: 'habit-master',
        name: 'Habit Master',
        description: 'Create 10 habits',
        icon: 'target',
        unlocked: totalHabits >= 10,
        progress: Math.min(totalHabits, 10),
        maxProgress: 10,
      },
      {
        id: 'perfect-week',
        name: 'Perfect Week',
        description: 'Complete all habits every day for a week',
        icon: 'zap',
        unlocked: false, // Would need more complex logic
        progress: 0,
        maxProgress: 7,
      },
    ];

    return NextResponse.json({ achievements });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch achievements' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

