import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAuth } from '@/lib/middleware';
import { generateHealthTip, generateWorkoutSuggestion, generateDietSuggestion } from '@/lib/ai-coach';
import { Habit as HabitType, DailyLog as DailyLogType } from '@/types';
import { getDaysAgo } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    // Get user's habits
    const habits = await Habit.find({ userId: userIdObj }).lean();
    const formattedHabits: HabitType[] = habits.map(h => ({
      id: h._id.toString(),
      userId: h.userId.toString(),
      name: h.name,
      category: h.category,
      type: h.type,
      steps: h.steps,
      targetPerDay: h.targetPerDay,
      schedule: h.schedule,
      createdAt: h.createdAt.toISOString(),
    }));
    
    // Get recent logs
    const weekAgo = getDaysAgo(7);
    const logs = await DailyLog.find({
      userId: userIdObj,
      date: { $gte: weekAgo },
    })
      .sort({ date: -1 })
      .lean();
    
    const formattedLogs: DailyLogType[] = logs.map(l => ({
      id: l._id.toString(),
      userId: l.userId.toString(),
      habitId: l.habitId.toString(),
      date: l.date,
      stepIndex: l.stepIndex,
      completed: l.completed,
      completedAt: l.completedAt?.toISOString(),
    }));
    
    // Generate tips
    const healthTip = generateHealthTip(formattedHabits, formattedLogs);
    const workoutSuggestion = generateWorkoutSuggestion(formattedLogs, formattedHabits);
    const dietSuggestion = generateDietSuggestion(formattedLogs, formattedHabits);
    
    return NextResponse.json({
      healthTip,
      workoutSuggestion,
      dietSuggestion,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI tips' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
