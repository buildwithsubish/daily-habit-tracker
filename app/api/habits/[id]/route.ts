import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAuth } from '@/lib/middleware';
import { scheduleHabitReminder, unscheduleHabitReminder } from '@/lib/reminder-scheduler';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { id: habitId } = await params;

    const habit = await Habit.findOne({
      _id: new mongoose.Types.ObjectId(habitId),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean() as unknown as {
      _id: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      name: string;
      order?: number;
      category: string;
      type: string;
      steps: any[];
      targetPerDay: number;
      schedule: any;
      createdAt: Date;
    } | null;

    if (!habit) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      habit: {
        id: habit._id.toString(),
        userId: habit.userId.toString(),
        name: habit.name,
        order: habit.order || 0,
        category: habit.category,
        type: habit.type,
        steps: habit.steps,
        targetPerDay: habit.targetPerDay,
        schedule: habit.schedule,
        description: (habit as any).description || '',
        descriptionEnabled: (habit as any).descriptionEnabled || false,
        dynamicChecklist: (habit as any).dynamicChecklist || false,
        checklistPrompt: (habit as any).checklistPrompt || '',
        streak: (habit as any).streak || 0,
        lastCompletedDate: (habit as any).lastCompletedDate,
        active: (habit as any).active !== false,
        inactiveAlertDays: (habit as any).inactiveAlertDays || 3,
        reminderEnabled: (habit as any).reminderEnabled || false,
        reminderTime: (habit as any).reminderTime || '08:00',
        reminderInterval: (habit as any).reminderInterval || 5,
        maxReminders: (habit as any).maxReminders || 3,
        reminderMessages: (habit as any).reminderMessages || [
          "Hey! Don't forget to complete {habit} today! 💪",
          "Quick reminder: {habit} is waiting for you! 🎯",
          "One last push! Complete {habit} now! 🚀",
        ],
        sendRemainder: (habit as any).sendRemainder || false,
        nextReminderScheduled: (habit as any).nextReminderScheduled,
        lastReminderSent: (habit as any).lastReminderSent,
        reminderResponseCount: (habit as any).reminderResponseCount || 0,
        whatsappEnabled: (habit as any).whatsappEnabled || false,
        whatsappFrequency: (habit as any).whatsappFrequency || 'manual',
        whatsappTime: (habit as any).whatsappTime || '08:00',
        activityLoggingEnabled: (habit as any).activityLoggingEnabled || false,
        advancedMode: (habit as any).advancedMode || false,
        subActivities: (habit as any).subActivities || [],
        createdAt: (habit as any).createdAt?.toISOString(),
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch habit' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { id: habitId } = await params;
    const data = await request.json();

    const { name, category, type, steps, targetPerDay, schedule, order, whatsappEnabled, whatsappFrequency, whatsappTime, active, inactiveAlertDays, reminderEnabled, reminderTime, reminderInterval, maxReminders, reminderMessages, activityLoggingEnabled, advancedMode, subActivities } = data;

    // Verify ownership
    const existing = await Habit.findOne({
      _id: new mongoose.Types.ObjectId(habitId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;
    if (steps !== undefined) updateData.steps = steps;
    if (targetPerDay !== undefined) updateData.targetPerDay = targetPerDay;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (order !== undefined) updateData.order = order;
    if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;
    if (whatsappFrequency !== undefined) updateData.whatsappFrequency = whatsappFrequency;
    if (whatsappTime !== undefined) updateData.whatsappTime = whatsappTime;
    if (active !== undefined) updateData.active = active;
    if (inactiveAlertDays !== undefined) updateData.inactiveAlertDays = inactiveAlertDays;

    if (reminderEnabled !== undefined) {
      updateData.reminderEnabled = reminderEnabled;
      if (reminderEnabled) {
        await scheduleHabitReminder(habitId);
      } else {
        await unscheduleHabitReminder(habitId);
      }
    }

    if (reminderTime !== undefined) {
      updateData.reminderTime = reminderTime;
      if (existing.reminderEnabled) {
        await scheduleHabitReminder(habitId);
      }
    }

    if (reminderInterval !== undefined) updateData.reminderInterval = reminderInterval;
    if (maxReminders !== undefined) updateData.maxReminders = maxReminders;
    if (reminderMessages !== undefined) updateData.reminderMessages = reminderMessages;
    if (activityLoggingEnabled !== undefined) updateData.activityLoggingEnabled = activityLoggingEnabled;
    if (advancedMode !== undefined) updateData.advancedMode = advancedMode;
    if (subActivities !== undefined) updateData.subActivities = subActivities;

    await Habit.findByIdAndUpdate(habitId, updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update habit' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { id: habitId } = await params;

    // Verify ownership
    const existing = await Habit.findOne({
      _id: new mongoose.Types.ObjectId(habitId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await DailyLog.deleteMany({ habitId: new mongoose.Types.ObjectId(habitId) });
    await Habit.findByIdAndDelete(habitId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete habit' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
