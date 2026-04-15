import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import MessageLog from '@/lib/models/MessageLog';
import { requireAuth } from '@/lib/middleware';
import { scheduleHabitReminder, unscheduleHabitReminder, sendHabitReminder, getReminderStatus } from '@/lib/reminder-scheduler';
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
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const status = await getReminderStatus(habitId);

    return NextResponse.json({
      reminderEnabled: habit.reminderEnabled || false,
      reminderTime: habit.reminderTime || '08:00',
      reminderInterval: habit.reminderInterval || 5,
      maxReminders: habit.maxReminders || 3,
      reminderMessages: habit.reminderMessages || [],
      nextReminderScheduled: habit.nextReminderScheduled,
      lastReminderSent: habit.lastReminderSent,
      reminderResponseCount: habit.reminderResponseCount || 0,
      lastResponseReceived: habit.lastResponseReceived,
      status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get reminder status' },
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

    const { reminderEnabled, reminderTime, reminderInterval, maxReminders, reminderMessages } = data;

    const habit = await Habit.findOne({
      _id: new mongoose.Types.ObjectId(habitId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const updateData: any = {};

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
      if (habit.reminderEnabled) {
        await scheduleHabitReminder(habitId);
      }
    }

    if (reminderInterval !== undefined) {
      updateData.reminderInterval = reminderInterval;
    }

    if (maxReminders !== undefined) {
      updateData.maxReminders = maxReminders;
    }

    if (reminderMessages !== undefined) {
      updateData.reminderMessages = reminderMessages;
    }

    await Habit.findByIdAndUpdate(habitId, updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update reminder settings' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(
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
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const result = await sendHabitReminder(habitId, userId, 0);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send reminder' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
