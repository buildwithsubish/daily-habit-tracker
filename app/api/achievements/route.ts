import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserIdFromRequest } from '@/lib/middleware';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { calculateAchievements } from '@/lib/achievementService';
import mongoose from 'mongoose';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    
    // Fetch user for celebrated achievements
    const user: any = await User.findById(userId).lean();
    const celebratedIds = user?.celebratedAchievements || [];

    
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
    
    let achievements = calculateAchievements(formattedHabits, formattedLogs);
    
    // Add celebrated status
    achievements = achievements.map(a => ({
      ...a,
      celebrated: celebratedIds.includes(a.id)
    }));
    
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
      { status: 500 }
    );
  }
}
