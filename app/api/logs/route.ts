import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyLog from '@/lib/models/DailyLog';
import { requireAuth } from '@/lib/middleware';
import { getToday } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getToday();
    const habitId = searchParams.get('habitId');
    
    const query: any = {
      userId: new mongoose.Types.ObjectId(userId),
      date,
    };
    
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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save log' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
