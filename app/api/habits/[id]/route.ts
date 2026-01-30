import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { id: habitId } = await params;
    const data = await request.json();
    
    const { name, category, type, steps, targetPerDay, schedule, order } = data;
    
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
    
    await Habit.findByIdAndDelete(habitId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete habit' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
