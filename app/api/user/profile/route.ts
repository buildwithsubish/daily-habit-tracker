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
      username: user.username || user.email?.split('@')[0] || 'User',
      email: user.email,
      timeZone: user.timeZone || 'UTC',
      createdAt: user.createdAt,
      age: user.age,
      height: user.height,
      weight: user.weight,
      lastWeightUpdate: user.lastWeightUpdate || null,
      weightHistory: user.weightHistory || [],
      gender: user.gender,
      activityLevel: user.activityLevel,
      healthGoal: user.healthGoal,
      reminderEnabled: user.reminderEnabled ?? false,
      reminderTime: user.reminderTime || '09:00',
      soundEnabled: user.soundEnabled ?? true,
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

    if (data.username !== undefined) {
      if (typeof data.username !== 'string' || data.username.trim().length === 0 || data.username.trim().length > 50) {
        return NextResponse.json({ error: 'Username must be between 1 and 50 characters' }, { status: 400 });
      }
      update.username = data.username.trim();
    }

    if (data.timeZone !== undefined) {
      if (typeof data.timeZone !== 'string') {
        return NextResponse.json({ error: 'Invalid timeZone' }, { status: 400 });
      }
      update.timeZone = data.timeZone.trim();
    }

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
      if (typeof data.reminderTime === 'string') {
        const trimmed = data.reminderTime.trim();
        // Normalize time: e.g. "9:05", "09:05:00", "09:05" -> "09:05"
        const match = trimmed.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
        if (match) {
          const hh = match[1].padStart(2, '0');
          const mm = match[2];
          update.reminderTime = `${hh}:${mm}`;
        } else {
          return NextResponse.json({ error: 'Reminder time must use HH:MM format' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Reminder time must be a string' }, { status: 400 });
      }
    }

    if (data.soundEnabled !== undefined) {
      if (typeof data.soundEnabled !== 'boolean') return NextResponse.json({ error: 'Invalid sound status' }, { status: 400 });
      update.soundEnabled = data.soundEnabled;
    }

    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    Object.assign(user, update);

    if (update.weight !== undefined) {
      user.lastWeightUpdate = new Date();
      if (!Array.isArray(user.weightHistory)) {
        user.weightHistory = [];
      }
      const todayStr = new Date().toISOString().split('T')[0];
      const existingIdx = user.weightHistory.findIndex((entry: any) => entry.date === todayStr);
      if (existingIdx >= 0) {
        user.weightHistory[existingIdx].weight = Number(update.weight);
        user.weightHistory[existingIdx].loggedAt = new Date();
      } else {
        user.weightHistory.push({
          weight: Number(update.weight),
          date: todayStr,
          loggedAt: new Date(),
        });
      }
      user.weightHistory.sort((a: any, b: any) => a.date.localeCompare(b.date));
    }

    await user.save();

    return NextResponse.json({
      success: true,
      profile: {
        username: user.username || user.email?.split('@')[0] || 'User',
        email: user.email,
        timeZone: user.timeZone || 'UTC',
        createdAt: user.createdAt,
        age: user.age,
        height: user.height,
        weight: user.weight,
        lastWeightUpdate: user.lastWeightUpdate || null,
        weightHistory: user.weightHistory || [],
        gender: user.gender,
        activityLevel: user.activityLevel,
        healthGoal: user.healthGoal,
        reminderEnabled: user.reminderEnabled ?? false,
        reminderTime: user.reminderTime || '09:00',
        soundEnabled: user.soundEnabled ?? true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
