import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';
import { sendHabitReminder, sendHabitPoll, getReminderStatus } from '@/lib/reminder-scheduler';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { habitId, type = 'reminder' } = await request.json();

    if (!habitId) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });
    }

    let result;
    if (type === 'poll') {
      const habitRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/habits/${habitId}`);
      const habitData = await habitRes.json();
      result = await sendHabitPoll(habitId, userId, habitData.habit?.name || 'your habit');
    } else {
      result = await sendHabitReminder(habitId, userId, 0);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `${type === 'poll' ? 'Poll' : 'Reminder'} sent successfully` });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send test reminder' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('habitId');

    if (!habitId) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });
    }

    const status = await getReminderStatus(habitId);

    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get reminder status' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
