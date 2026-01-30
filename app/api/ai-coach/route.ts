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
    
    type HabitLean = { 
      _id: mongoose.Types.ObjectId; 
      userId: mongoose.Types.ObjectId; 
      name: string; 
      category: 'Health' | 'Productivity' | 'Mindfulness' | 'Fitness' | 'Diet'; 
      type: 'single-step' | 'multi-step'; 
      steps: any[]; 
      targetPerDay: number; 
      schedule: any; 
      createdAt: Date;
      order?: number;
    };
    const typedHabits = habits as unknown as HabitLean[];
    
    const formattedHabits: HabitType[] = typedHabits.map(h => ({
      id: h._id.toString(),
      userId: h.userId.toString(),
      name: h.name,
      category: h.category,
      type: h.type,
      steps: h.steps,
      targetPerDay: h.targetPerDay,
      schedule: h.schedule,
      streak: (h as any).streak || 0,
      lastCompletedDate: (h as any).lastCompletedDate,
      createdAt: h.createdAt.toISOString(),
      order: h.order || 0,
    }));
    
    // Get recent logs
    const weekAgo = getDaysAgo(7);
    const logs = await DailyLog.find({
      userId: userIdObj,
      date: { $gte: weekAgo },
    })
      .sort({ date: -1 })
      .lean();
    
    type LogLean = { 
      _id: mongoose.Types.ObjectId; 
      userId: mongoose.Types.ObjectId; 
      habitId: mongoose.Types.ObjectId; 
      date: string; 
      stepIndex: number | null; 
      completed: boolean; 
      completedAt: Date | null;
    };
    const typedLogs = logs as unknown as LogLean[];
    
    const formattedLogs: DailyLogType[] = typedLogs.map(l => ({
      id: l._id.toString(),
      userId: l.userId.toString(),
      habitId: l.habitId.toString(),
      date: l.date,
      stepIndex: l.stepIndex ?? undefined,
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
