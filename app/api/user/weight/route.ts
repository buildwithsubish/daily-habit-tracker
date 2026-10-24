import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    await connectDB();

    const user = await User.findById(new mongoose.Types.ObjectId(userId))
      .select('weight lastWeightUpdate weightHistory healthGoal')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const typedUser = user as any;
    const history = (typedUser.weightHistory || []).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      currentWeight: typedUser.weight || null,
      lastWeightUpdate: typedUser.lastWeightUpdate || null,
      healthGoal: typedUser.healthGoal || 'maintain',
      weightHistory: history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    await connectDB();

    const weightNum = Number(body.weight);
    if (!Number.isFinite(weightNum) || weightNum < 25 || weightNum > 400) {
      return NextResponse.json(
        { error: 'Weight must be a valid number between 25 kg and 400 kg' },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const logDate = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : todayStr;

    const note = typeof body.note === 'string' ? body.note.trim() : '';

    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!Array.isArray(user.weightHistory)) {
      user.weightHistory = [];
    }

    // Check if an entry for this exact date already exists
    const existingIndex = user.weightHistory.findIndex((entry: any) => entry.date === logDate);

    if (existingIndex >= 0) {
      user.weightHistory[existingIndex].weight = weightNum;
      user.weightHistory[existingIndex].loggedAt = new Date();
      if (note) user.weightHistory[existingIndex].note = note;
    } else {
      user.weightHistory.push({
        weight: weightNum,
        date: logDate,
        loggedAt: new Date(),
        note,
      });
    }

    // Sort ascending by date
    user.weightHistory.sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Update current weight and timestamp
    user.weight = weightNum;
    user.lastWeightUpdate = new Date();

    await user.save();

    return NextResponse.json({
      success: true,
      currentWeight: user.weight,
      lastWeightUpdate: user.lastWeightUpdate,
      weightHistory: user.weightHistory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let history = Array.isArray(user.weightHistory) ? [...user.weightHistory] : [];
    history = history.filter((entry: any) => entry.date !== date);
    history.sort((a: any, b: any) => a.date.localeCompare(b.date));

    if (history.length > 0) {
      const latest = history[history.length - 1];
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            weightHistory: history,
            weight: latest.weight,
            lastWeightUpdate: latest.loggedAt || new Date(),
          },
        }
      );
      return NextResponse.json({
        success: true,
        currentWeight: latest.weight,
        weightHistory: history,
      });
    } else {
      // Either history was emptied or user deleted the only/synthesized entry
      await User.updateOne(
        { _id: user._id },
        {
          $set: { weightHistory: [] },
          $unset: { weight: 1, lastWeightUpdate: 1 },
        }
      );
      return NextResponse.json({
        success: true,
        currentWeight: null,
        weightHistory: [],
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

