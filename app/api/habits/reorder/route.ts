import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { habitIds } = await request.json();
    
    if (!Array.isArray(habitIds)) {
      return NextResponse.json(
        { error: 'habitIds must be an array' },
        { status: 400 }
      );
    }
    
    // Update order for each habit
    const updatePromises = habitIds.map((habitId: string, index: number) =>
      Habit.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(habitId),
          userId: new mongoose.Types.ObjectId(userId),
        },
        { order: index },
        { new: true }
      )
    );
    
    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reorder habits' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

