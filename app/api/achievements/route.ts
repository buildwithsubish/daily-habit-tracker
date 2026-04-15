import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { calculateAchievements } from '@/lib/achievementService';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    
    // Fetch all habits and logs for the user
    const habits = await Habit.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    const logs = await DailyLog.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    
    // Map _id to id for consistency
    const formattedHabits = habits.map((h: any) => ({
      ...h,
      id: h._id.toString(),
    }));
    
    const formattedLogs = logs.map((l: any) => ({
      ...l,
      id: l._id.toString(),
    }));
    
    const achievements = calculateAchievements(formattedHabits, formattedLogs);
    
    const totalPoints = achievements
      .filter(a => a.achieved)
      .reduce((sum, a) => sum + a.points, 0);
      
    const unlockedCount = achievements.filter(a => a.achieved).length;
    
    return NextResponse.json({
      achievements,
      stats: {
        totalPoints,
        unlockedCount,
        totalCount: achievements.length,
      }
    });
  } catch (error: any) {
    console.error('Achievements API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch achievements' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
