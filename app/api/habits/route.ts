import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);

    const habits = await Habit.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    type HabitLean = {
      _id: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      name: string;
      order?: number;
      category: string;
      type: string;
      steps: any[];
      targetPerDay: number;
      schedule: any;
      hidden?: boolean;
      createdAt: Date;
    };
    const typedHabits = habits as unknown as HabitLean[];

    const formattedHabits = typedHabits.map(h => ({
      id: h._id.toString(),
      userId: h.userId.toString(),
      name: h.name,
      order: h.order || 0,
      category: h.category,
      type: h.type,
      steps: h.steps,
      targetPerDay: h.targetPerDay,
      schedule: h.schedule,
      description: (h as any).description || '',
      descriptionEnabled: (h as any).descriptionEnabled || false,
      dynamicChecklist: (h as any).dynamicChecklist || false,
      checklistPrompt: (h as any).checklistPrompt || '',
      streak: (h as any).streak || 0,
      lastCompletedDate: (h as any).lastCompletedDate,
      active: (h as any).active !== false,
      inactiveAlertDays: (h as any).inactiveAlertDays || 3,
      reminderEnabled: (h as any).reminderEnabled || false,
      reminderTime: (h as any).reminderTime || '08:00',
      reminderInterval: (h as any).reminderInterval || 5,
      maxReminders: (h as any).maxReminders || 3,
      reminderMessages: (h as any).reminderMessages || [
        "Hey! Don't forget to complete {habit} today! 💪",
        "Quick reminder: {habit} is waiting for you! 🎯",
        "One last push! Complete {habit} now! 🚀",
        "Time to shine! {habit} is ready for you! ⭐",
        "Don't break the streak! Complete {habit} now! 🔥",
      ],
      sendRemainder: (h as any).sendRemainder || false,
      nextReminderScheduled: (h as any).nextReminderScheduled,
      lastReminderSent: (h as any).lastReminderSent,
      reminderResponseCount: (h as any).reminderResponseCount || 0,
      whatsappEnabled: (h as any).whatsappEnabled || false,
      whatsappFrequency: (h as any).whatsappFrequency || 'manual',
      whatsappTime: (h as any).whatsappTime || '08:00',
      activityLoggingEnabled: (h as any).activityLoggingEnabled || false,
      advancedMode: (h as any).advancedMode || false,
      subActivities: (h as any).subActivities || [],
      hidden: (h as any).hidden || false,
      createdAt: h.createdAt.toISOString(),
    }));

    return NextResponse.json({ habits: formattedHabits });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch habits' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const data = await request.json();

    const { name, category, type, steps, targetPerDay = 1, schedule, description, descriptionEnabled, dynamicChecklist, checklistPrompt, inactiveAlertDays, reminderEnabled, reminderTime, reminderInterval, maxReminders, reminderMessages, activityLoggingEnabled, advancedMode, subActivities, sendRemainder } = data;

    if (!name || !category || !type || !steps) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the next order
    const lastHabit = await Habit.findOne({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ order: -1 })
      .select('order')
      .lean() as unknown as { order?: number } | null;
    const nextOrder = lastHabit && lastHabit.order !== undefined ? lastHabit.order + 1 : 0;

    const defaultMessages = [
      "Hey! Don't forget to complete {habit} today! 💪",
      "Quick reminder: {habit} is waiting for you! 🎯",
      "One last push! Complete {habit} now! 🚀",
    ];

    const habit = await Habit.create({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      category,
      type,
      steps,
      targetPerDay,
      schedule,
      description: description || '',
      descriptionEnabled: descriptionEnabled || false,
      dynamicChecklist: dynamicChecklist || false,
      checklistPrompt: checklistPrompt || '',
      order: nextOrder,
      active: true,
      inactiveAlertDays: inactiveAlertDays || 3,
      reminderEnabled: reminderEnabled || false,
      reminderTime: reminderTime || '08:00',
      reminderInterval: reminderInterval || 5,
      maxReminders: maxReminders || 3,
      reminderMessages: reminderMessages || defaultMessages,
      sendRemainder: sendRemainder !== undefined ? Boolean(sendRemainder) : false,
      activityLoggingEnabled: activityLoggingEnabled || false,
      advancedMode: advancedMode || false,
      subActivities: subActivities || [],
    });

    return NextResponse.json({
      habit: {
        id: habit._id.toString(),
        userId: habit.userId.toString(),
        name: habit.name,
        category: habit.category,
        type: habit.type,
        steps: habit.steps,
        targetPerDay: habit.targetPerDay,
        schedule: habit.schedule,
        streak: habit.streak || 0,
        lastCompletedDate: habit.lastCompletedDate,
        active: habit.active !== false,
        inactiveAlertDays: habit.inactiveAlertDays || 3,
        hidden: habit.hidden || false,
        createdAt: habit.createdAt.toISOString(),
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create habit' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
