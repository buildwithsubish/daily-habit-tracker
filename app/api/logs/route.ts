import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyLog from '@/lib/models/DailyLog';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import { getToday, getDaysAgo } from '@/lib/utils';
import { SubActivity } from '@/types';
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
      activityNote?: string | null;
      subActivities?: SubActivity[];
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
      activityNote: log.activityNote || null,
      subActivities: log.subActivities || [],
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
    
    const { habitId, date, stepIndex, completed, activityNote, subActivities } = data;
    
    if (habitId === undefined || date === undefined || completed === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    const habitIdObj = new mongoose.Types.ObjectId(habitId);
    
    // Upsert log
    const updateData: any = {
      completed,
      completedAt: completed ? new Date() : null,
    };
    
    // Only set activityNote if provided
    if (activityNote !== undefined) {
      updateData.activityNote = activityNote || null;
    }

    // Only set subActivities if provided
    if (subActivities !== undefined) {
      updateData.subActivities = subActivities || [];
    }
    
    await DailyLog.findOneAndUpdate(
      {
        userId: userIdObj,
        habitId: habitIdObj,
        date,
        stepIndex: stepIndex ?? null,
      },
      updateData,
      { upsert: true, new: true }
    );

    // Update habit streak logic (race-safe, avoids double updates)
    const habitResult = await Habit.findOne({ _id: habitIdObj, userId: userIdObj }).lean().exec();
    const habit = Array.isArray(habitResult) ? habitResult[0] : habitResult;
    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const today = getToday();
    const yesterday = getDaysAgo(1);

    // Determine if the habit is fully completed for the given date
    const completedCount = await DailyLog.countDocuments({
      userId: userIdObj,
      habitId: habitIdObj,
      date,
      completed: true,
    });

    const isFullyCompleted =
      habit.type === 'single-step'
        ? completedCount > 0
        : completedCount === (habit.steps?.length || 0);

    let updatedHabit: any = null;

    // Only streak today is tracked/stored in the habit doc.
    if (date === today) {
      if (isFullyCompleted) {
        // Case 1: If last completed was yesterday, increment streak atomically.
        updatedHabit = await Habit.findOneAndUpdate(
          { _id: habitIdObj, userId: userIdObj, lastCompletedDate: yesterday },
          { $inc: { streak: 1 }, $set: { lastCompletedDate: today } },
          { new: true }
        ).lean();

        // Case 2: Otherwise, if we haven't already recorded today, set streak to 1 atomically.
        if (!updatedHabit) {
          updatedHabit = await Habit.findOneAndUpdate(
            { _id: habitIdObj, userId: userIdObj, lastCompletedDate: { $ne: today } },
            { $set: { streak: 1, lastCompletedDate: today } },
            { new: true }
          ).lean();
        }
      } else {
        // If it was marked completed today and now isn't, revert streak based on whether yesterday was fully completed.
        const yesterdayCount = await DailyLog.countDocuments({
          userId: userIdObj,
          habitId: habitIdObj,
          date: yesterday,
          completed: true,
        });

        const completedYesterday =
          habit.type === 'single-step'
            ? yesterdayCount > 0
            : yesterdayCount === (habit.steps?.length || 0);

        updatedHabit = await Habit.findOneAndUpdate(
          { _id: habitIdObj, userId: userIdObj, lastCompletedDate: today },
          { $set: { streak: completedYesterday ? 1 : 0, lastCompletedDate: completedYesterday ? yesterday : null } },
          { new: true }
        ).lean();
      }
    }

    const streakValue = (updatedHabit?.streak ?? (habit as any).streak ?? 0) as number;
    return NextResponse.json({ success: true, streak: streakValue });
  } catch (error: any) {
    console.error('Save log error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save log' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
