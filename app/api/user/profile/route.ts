import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    await connectDB();
    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      age: user.age,
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      activityLevel: user.activityLevel,
      healthGoal: user.healthGoal,
      reminderEnabled: user.reminderEnabled ?? false,
      reminderTime: user.reminderTime || '09:00',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const data = await req.json();
    await connectDB();

    const update: Record<string, unknown> = {};
    for (const field of ['age', 'height', 'weight', 'gender', 'activityLevel', 'healthGoal'] as const) {
      if (data[field] !== undefined) update[field] = data[field];
    }
    const numericRanges = { age: [13, 120], height: [80, 250], weight: [25, 400] } as const;
    for (const field of Object.keys(numericRanges) as Array<keyof typeof numericRanges>) {
      if (update[field] === null || update[field] === '') { delete update[field]; continue; }
      const value = update[field];
      const [min, max] = numericRanges[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
      }
    }
    const enums = {
      gender: ['male', 'female', 'other'],
      activityLevel: ['sedentary', 'light', 'moderate', 'very', 'extra'],
      healthGoal: ['loss', 'maintain', 'gain'],
    } as const;
    for (const field of Object.keys(enums) as Array<keyof typeof enums>) {
      if (update[field] === '') { delete update[field]; continue; }
      if (update[field] !== undefined && !(enums[field] as readonly unknown[]).includes(update[field])) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
      }
    }
    if (data.reminderEnabled !== undefined) {
      if (typeof data.reminderEnabled !== 'boolean') return NextResponse.json({ error: 'Invalid reminder status' }, { status: 400 });
      update.reminderEnabled = data.reminderEnabled;
    }
    if (data.reminderTime !== undefined) {
      if (typeof data.reminderTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime)) {
        return NextResponse.json({ error: 'Reminder time must use HH:MM' }, { status: 400 });
      }
      update.reminderTime = data.reminderTime;
    }

    const user = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      profile: {
        age: user.age,
        height: user.height,
        weight: user.weight,
        gender: user.gender,
        activityLevel: user.activityLevel,
        healthGoal: user.healthGoal,
        reminderEnabled: user.reminderEnabled ?? false,
        reminderTime: user.reminderTime || '09:00',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
