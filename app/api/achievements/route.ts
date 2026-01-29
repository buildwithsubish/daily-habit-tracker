import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAuth } from '@/lib/middleware';
import { getToday, getDaysAgo, isHabitScheduled } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get user's habits
    const habits = await Habit.find({ userId: userIdObj }).lean();
    const totalHabits = habits.length;

    // Get all completed logs to calculate global streak
    // A global streak day is any day where at least one habit was fully completed
    const logs = await DailyLog.find({
      userId: userIdObj,
      completed: true,
    }).sort({ date: -1 }).lean();

    // Group logs by date and habit
    const completionsByDate: Record<string, Set<string>> = {};
    logs.forEach((log: any) => {
      const habitId = log.habitId.toString();
      const habit = habits.find((h: any) => h._id.toString() === habitId);
      if (!habit) return;

      if (!completionsByDate[log.date]) {
        completionsByDate[log.date] = new Set();
      }

      // Check for full completion
      if (habit.type === 'single-step') {
        completionsByDate[log.date].add(habitId);
      } else {
        const habitLogsForDate = logs.filter((l: any) => l.date === log.date && l.habitId.toString() === habitId);
        if (habitLogsForDate.length === habit.steps.length) {
          completionsByDate[log.date].add(habitId);
        }
      }
    });

    const completedDates = Object.keys(completionsByDate)
      .filter(date => completionsByDate[date].size > 0)
      .sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    const today = getToday();
    const yesterday = getDaysAgo(1);
    
    if (completedDates.length > 0) {
      const mostRecentDate = completedDates[0];
      
      // Streak is active if most recent completion is today or yesterday
      if (mostRecentDate === today || mostRecentDate === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < completedDates.length; i++) {
          const d1 = new Date(completedDates[i - 1]);
          const d2 = new Date(completedDates[i]);
          const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Max streak among all individual habits
    const maxHabitStreak = habits.length > 0 
      ? Math.max(...habits.map((h: any) => h.streak || 0)) 
      : 0;

    const scheduledToday = habits.filter(h => isHabitScheduled(h, today));
    const completedTodayCount = completionsByDate[today]?.size || 0;
    const totalCompletions = logs.length;

    const healthHabits = habits.filter(h => h.category === 'Health' || h.category === 'Diet').length;
    
    // Check for weekend completions
    const weekendCompletions = logs.some((l: any) => {
        const day = new Date(l.date).getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    });

    const achievements = [
      {
        id: 'first-habit',
        name: 'Amazing Start!',
        description: 'You took the first step by creating a habit. Keep it up!',
        icon: 'star',
        unlocked: totalHabits >= 1,
        progress: Math.min(totalHabits, 1),
        maxProgress: 1,
      },
      {
        id: 'week-streak',
        name: 'You\'re on Fire!',
        description: '7 days in a row! You are becoming unstoppable.',
        icon: 'flame',
        unlocked: currentStreak >= 7 || maxHabitStreak >= 7,
        progress: Math.min(Math.max(currentStreak, maxHabitStreak), 7),
        maxProgress: 7,
      },
      {
        id: 'consistency-king',
        name: 'Consistency King',
        description: '10 days of showing up for yourself. Incredible!',
        icon: 'zap',
        unlocked: currentStreak >= 10 || maxHabitStreak >= 10,
        progress: Math.min(Math.max(currentStreak, maxHabitStreak), 10),
        maxProgress: 10,
      },
      {
        id: 'month-streak',
        name: 'Habit Champion',
        description: 'A whole month of progress! This is how lives change.',
        icon: 'trophy',
        unlocked: currentStreak >= 30 || maxHabitStreak >= 30,
        progress: Math.min(Math.max(currentStreak, maxHabitStreak), 30),
        maxProgress: 30,
      },
      {
        id: 'habit-master',
        name: 'Super Planner',
        description: 'Managing 5 different habits. You\'re a pro!',
        icon: 'target',
        unlocked: totalHabits >= 5,
        progress: Math.min(totalHabits, 5),
        maxProgress: 5,
      },
      {
        id: 'perfect-day',
        name: 'Perfect Day!',
        description: 'You finished every single thing today. Pure gold!',
        icon: 'zap',
        unlocked: scheduledToday.length > 0 && completedTodayCount >= scheduledToday.length,
        progress: completedTodayCount,
        maxProgress: Math.max(scheduledToday.length, 1),
      },
      {
        id: 'early-bird',
        name: 'Early Bird',
        description: 'Winning the morning by finishing a habit before 8 AM!',
        icon: 'star',
        unlocked: logs.some((l: any) => {
            const time = new Date(l.createdAt || Date.now()).getHours();
            return time < 8;
        }),
        progress: logs.some((l: any) => {
            const time = new Date(l.createdAt || Date.now()).getHours();
            return time < 8;
        }) ? 1 : 0,
        maxProgress: 1,
      },
      {
        id: 'weekend-warrior',
        name: 'Weekend Warrior',
        description: 'You didn\'t stop just because it\'s the weekend!',
        icon: 'flame',
        unlocked: weekendCompletions,
        progress: weekendCompletions ? 1 : 0,
        maxProgress: 1,
      },
      {
        id: 'health-nut',
        name: 'Health Hero',
        description: '3 habits dedicated to your health. Your body thanks you!',
        icon: 'heart',
        unlocked: healthHabits >= 3,
        progress: Math.min(healthHabits, 3),
        maxProgress: 3,
      },
      {
        id: 'grand-master',
        name: 'Grand Master',
        description: '100 total habit completions! You are a legend.',
        icon: 'trophy',
        unlocked: totalCompletions >= 100,
        progress: Math.min(totalCompletions, 100),
        maxProgress: 100,
      },
    ];

    return NextResponse.json({ achievements });
  } catch (error: any) {
    console.error('Achievements error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch achievements' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
