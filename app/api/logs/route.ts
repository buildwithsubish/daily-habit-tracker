import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyLog from '@/lib/models/DailyLog';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import { getToday, isHabitScheduled } from '@/lib/utils';
import { SubActivity, WorkoutData, DynamicStep } from '@/types';
import mongoose from 'mongoose';

function dateInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getScheduledStreakDates(habit: any, completeDates: Set<string>, today: string) {
  let cursor = completeDates.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  let latestCompletedDate: string | null = null;

  // Bound the calendar walk to 100 years; normal histories stop at the first missed scheduled day.
  for (let checked = 0; checked < 36_600; checked += 1) {
    if (isHabitScheduled(habit, cursor)) {
      if (!completeDates.has(cursor)) break;
      streak += 1;
      latestCompletedDate ??= cursor;
    }
    cursor = shiftDate(cursor, -1);
  }

  return { streak, latestCompletedDate };
}


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
      if (!isValidDateString(startDate) || !isValidDateString(endDate) || startDate > endDate) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
      }
      const rangeLength = Math.round((new Date(`${endDate}T12:00:00Z`).getTime() - new Date(`${startDate}T12:00:00Z`).getTime()) / 86_400_000) + 1;
      if (rangeLength > 31) return NextResponse.json({ error: 'Date range cannot exceed 31 days' }, { status: 400 });
      query.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
      if (!isValidDateString(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      query.date = date;
    } else {
      query.date = getToday();
    }
    
    if (habitId) {
      if (!mongoose.isValidObjectId(habitId)) {
        return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
      }
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
      dynamicSteps?: DynamicStep[];
      value?: number;
      workoutData?: WorkoutData | null;
      customFields?: Record<string, string | number | boolean>;
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
      dynamicSteps: log.dynamicSteps || [],
      value: log.value,
      workoutData: log.workoutData || undefined,
      customFields: log.customFields || undefined,
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
    
    const { habitId, date, stepIndex, completed, activityNote, subActivities, value, workoutData, customFields } = data;
    
    if (habitId === undefined || date === undefined || completed === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let timeZone = typeof data.timeZone === 'string' ? data.timeZone : 'UTC';
    try {
      dateInTimeZone(timeZone);
    } catch {
      timeZone = 'UTC';
    }
    if (typeof date !== 'string' || !isValidDateString(date)) {
      return NextResponse.json({ error: 'Date must be a valid YYYY-MM-DD date' }, { status: 400 });
    }
    const todayForUser = dateInTimeZone(timeZone);
    if (date > todayForUser || date < shiftDate(todayForUser, -7)) {
      return NextResponse.json({ error: 'Progress can only be edited for today or the previous 7 days' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(habitId) || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid habit or completion value' }, { status: 400 });
    }
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000)) {
      return NextResponse.json({ error: 'Value must be a non-negative number' }, { status: 400 });
    }
    let sanitizedWorkoutData = workoutData;
    if (workoutData !== undefined && workoutData !== null) {
      if (typeof workoutData !== 'object' || Array.isArray(workoutData)) {
        return NextResponse.json({ error: 'Invalid workout details' }, { status: 400 });
      }
      const rawExercises = Array.isArray(workoutData.exercises) ? workoutData.exercises : [];
      const cleanExercises = rawExercises
        .filter((ex: any) => ex && typeof ex === 'object')
        .map((ex: any, idx: number) => ({
          name: typeof ex.name === 'string' && ex.name.trim() ? ex.name.trim().slice(0, 120) : `Exercise ${idx + 1}`,
          sets: Array.isArray(ex.sets)
            ? ex.sets.map((s: any) => ({
                completed: Boolean(s.completed),
                reps: Number.isFinite(Number(s.reps)) ? Math.max(0, Number(s.reps)) : 0,
                weight: Number.isFinite(Number(s.weight)) ? Math.max(0, Number(s.weight)) : 0,
                duration: Number.isFinite(Number(s.duration)) ? Math.max(0, Number(s.duration)) : undefined,
              }))
            : [{ completed: true, reps: 10, weight: 0 }],
          notes: typeof ex.notes === 'string' ? ex.notes.slice(0, 300) : undefined,
        }));

      sanitizedWorkoutData = {
        intensity: ['low', 'medium', 'high'].includes(workoutData.intensity) ? workoutData.intensity : 'medium',
        totalDuration: Number.isFinite(Number(workoutData.totalDuration)) ? Math.min(1440, Math.max(0, Number(workoutData.totalDuration))) : 45,
        caloriesBurned: Number.isFinite(Number(workoutData.caloriesBurned)) ? Math.min(20000, Math.max(0, Number(workoutData.caloriesBurned))) : 200,
        goal: ['weight-loss', 'maintain', 'weight-gain'].includes(workoutData.goal) ? workoutData.goal : 'maintain',
        exercises: cleanExercises,
      };

      if (JSON.stringify(sanitizedWorkoutData).length > 50_000) {
        return NextResponse.json({ error: 'Workout details are too large' }, { status: 413 });
      }
    }

    if (activityNote !== undefined && (typeof activityNote !== 'string' || activityNote.length > 2_000)) {
      return NextResponse.json({ error: 'Activity note must be 2,000 characters or fewer' }, { status: 400 });
    }

    let sanitizedSubActivities: any[] | undefined = undefined;
    if (subActivities !== undefined) {
      if (!Array.isArray(subActivities) || subActivities.length > 100) {
        return NextResponse.json({ error: 'Invalid activity details' }, { status: 400 });
      }
      sanitizedSubActivities = subActivities
        .filter(item => item && typeof item === 'object')
        .map(item => {
          const name = typeof item.name === 'string' ? item.name.trim().slice(0, 120) : 'Activity';
          const type = ['text', 'number', 'reps', 'duration', 'kg'].includes(item.type) ? item.type : 'text';
          const value = item.value !== undefined && item.value !== null ? String(item.value).slice(0, 500) : '';
          return { name, type, value };
        });
    }
    if (customFields !== undefined && (typeof customFields !== 'object' || customFields === null || Array.isArray(customFields) || Object.keys(customFields).length > 30)) {
      return NextResponse.json({ error: 'Invalid custom fields' }, { status: 400 });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    const habitIdObj = new mongoose.Types.ObjectId(habitId);

    // Verify ownership before writing so a foreign or missing habit can never
    // create an orphaned daily log.
    const habitResult = await Habit.findOne({ _id: habitIdObj, userId: userIdObj }).lean().exec();
    const habit = Array.isArray(habitResult) ? habitResult[0] : habitResult;
    if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    if (habit.type === 'single-step' && stepIndex != null) {
      return NextResponse.json({ error: 'Single-step habits do not accept a step index' }, { status: 400 });
    }
    if (habit.type !== 'single-step' && (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= (habit.steps?.length || 0))) {
      return NextResponse.json({ error: 'Invalid habit step' }, { status: 400 });
    }
    
    // Upsert log
    const updateData: any = {
      completed,
      completedAt: completed ? new Date() : null,
    };
    if (value !== undefined) updateData.value = completed ? value : null;
    if (workoutData !== undefined) updateData.workoutData = completed ? sanitizedWorkoutData : null;
    if (customFields !== undefined) updateData.customFields = completed ? customFields : null;
    
    // Only set activityNote if provided
    if (activityNote !== undefined) {
      updateData.activityNote = activityNote || null;
    }

    // Only set subActivities if provided
    if (subActivities !== undefined) {
      updateData.subActivities = completed ? (sanitizedSubActivities || []) : [];
    }
    if (!completed) {
      updateData.activityNote = null;
      updateData.subActivities = [];
      updateData.dynamicSteps = [];
      updateData.value = null;
      updateData.workoutData = null;
      updateData.customFields = null;
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

    // Recalculate scheduled-day streaks after edits, including history corrections.
    const today = todayForUser;

    let isFullyCompleted = false;
    let updatedHabit: any = null;

    const currentDayLogs = await DailyLog.find({ userId: userIdObj, habitId: habitIdObj, date: today, completed: true })
      .select('stepIndex').lean();
    isFullyCompleted = habit.type === 'single-step'
      ? currentDayLogs.some(log => log.stepIndex == null)
      : new Set(currentDayLogs.map(log => log.stepIndex)).size === (habit.steps?.length || 0);

    const completedDayGroups = await DailyLog.aggregate<{ _id: string; stepIndexes: Array<number | null> }>([
      { $match: { userId: userIdObj, habitId: habitIdObj, completed: true, date: { $lte: today } } },
      { $group: { _id: '$date', stepIndexes: { $addToSet: '$stepIndex' } } },
    ]);
    const completeDates = new Set(
      completedDayGroups
        .filter(group => habit.type === 'single-step'
          ? group.stepIndexes.includes(null)
          : (habit.steps || []).every((_: unknown, index: number) => group.stepIndexes.includes(index)))
        .map(group => group._id)
    );
    const streakState = getScheduledStreakDates(habit, completeDates, today);
    updatedHabit = await Habit.findOneAndUpdate(
      { _id: habitIdObj, userId: userIdObj },
      { $set: { streak: streakState.streak, lastCompletedDate: streakState.latestCompletedDate } },
      { new: true }
    ).lean();

    // Check if ALL scheduled habits for today are done (for celebration)
    let dailyAllDone = false;
    if (date === today && isFullyCompleted) {
      const allHabits = await Habit.find({ userId: userIdObj, active: { $ne: false } }).lean().exec();
      const scheduledToday = allHabits.filter(h => isHabitScheduled(h, today));
      if (scheduledToday.length > 0) {
        const todayLogs = await DailyLog.find({ userId: userIdObj, date: today, completed: true }).select('habitId stepIndex').lean().exec();
        const completedByHabit = new Map<string, Set<number | null>>();
        for (const log of todayLogs) {
          const key = log.habitId.toString();
          if (!completedByHabit.has(key)) completedByHabit.set(key, new Set());
          completedByHabit.get(key)!.add(log.stepIndex ?? null);
        }
        dailyAllDone = scheduledToday.every((h: any) => {
          const hLogs = completedByHabit.get(h._id.toString()) || new Set<number | null>();
          if (h.type === 'single-step') {
            return hLogs.has(null);
          } else {
            return h.steps.every((_: unknown, index: number) => hLogs.has(index));
          }
        });
      }
    }


    const streakValue = (updatedHabit?.streak ?? (habit as any).streak ?? 0) as number;
    return NextResponse.json({ 
      success: true, 
      streak: streakValue,
      dailyAllDone: dailyAllDone && date === today && isFullyCompleted
    });

  } catch (error: any) {
    console.error('Save log error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save log' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
