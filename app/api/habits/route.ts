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
    
    const formattedHabits = habits.map(h => ({
      id: h._id.toString(),
      userId: h.userId.toString(),
      name: h.name,
      order: h.order,
      category: h.category,
      type: h.type,
      steps: h.steps,
      targetPerDay: h.targetPerDay,
      schedule: h.schedule,
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
    
    const { name, category, type, steps, targetPerDay = 1, schedule } = data;
    
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
      .lean();
    const nextOrder = lastHabit ? lastHabit.order + 1 : 0;
    
    const habit = await Habit.create({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      category,
      type,
      steps,
      targetPerDay,
      schedule,
      order: nextOrder,
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
