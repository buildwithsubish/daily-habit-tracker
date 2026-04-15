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

    const user = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      {
        $set: {
          age: data.age,
          height: data.height,
          weight: data.weight,
          gender: data.gender,
          activityLevel: data.activityLevel,
          healthGoal: data.healthGoal,
        }
      },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
