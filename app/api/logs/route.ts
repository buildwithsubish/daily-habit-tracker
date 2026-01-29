import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyLog from '@/lib/models/DailyLog';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import { getToday, getDaysAgo } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const habitId = searchParams.get('habitId');
    
    const query: any = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
      query.date = date;
    } else {
      query.date = getToday();
    }
    
    if (habitId) {
      query.habitId = new mongoose.Types.ObjectId(habitId);
    }
    
    const logs = await DailyLog.find(query).lean();
    
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
    
    const formattedLogs = typedLogs.map(log => ({
      id: log._id.toString(),
      userId: log.userId.toString(),
      habitId: log.habitId.toString(),
      date: log.date,
      stepIndex: log.stepIndex,
      completed: log.completed,
      completedAt: log.completedAt?.toISOString(),
    }));
    
    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const data = await request.json();
    
    const { habitId, date, stepIndex, completed } = data;
    
    if (habitId === undefined || date === undefined || completed === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Upsert log
    await DailyLog.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        habitId: new mongoose.Types.ObjectId(habitId),
        date,
        stepIndex: stepIndex ?? null,
      },
      {
        completed,
        completedAt: completed ? new Date() : null,
      },
      { upsert: true, new: true }
    );

    // Update habit streak logic
    const habit = await Habit.findById(habitId);
    if (habit) {
      const today = getToday();
      const yesterday = getDaysAgo(1);
      
      // Check if habit is fully completed for the given date
      const logsForDate = await DailyLog.find({
        userId: new mongoose.Types.ObjectId(userId),
        habitId: new mongoose.Types.ObjectId(habitId),
        date,
        completed: true
      });

      const isFullyCompleted = habit.type === 'single-step' 
        ? logsForDate.length > 0 
        : logsForDate.length === habit.steps.length;

      if (isFullyCompleted && date === today) {
        if (habit.lastCompletedDate === yesterday) {
          habit.streak += 1;
        } else if (habit.lastCompletedDate !== today) {
          habit.streak = 1;
        }
        habit.lastCompletedDate = today;
      } else if (!isFullyCompleted && date === today && habit.lastCompletedDate === today) {
        // If it was completed today and now it's not, check if it was completed yesterday
        const logsForYesterday = await DailyLog.find({
          userId: new mongoose.Types.ObjectId(userId),
          habitId: new mongoose.Types.ObjectId(habitId),
          date: yesterday,
          completed: true
        });
        const completedYesterday = habit.type === 'single-step' 
          ? logsForYesterday.length > 0 
          : logsForYesterday.length === habit.steps.length;
        
        habit.streak = completedYesterday ? 1 : 0;
        habit.lastCompletedDate = completedYesterday ? yesterday : null;
      }
      
      await habit.save();
    }
    
    return NextResponse.json({ success: true, streak: habit?.streak || 0 });
  } catch (error: any) {
    console.error('Save log error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save log' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
