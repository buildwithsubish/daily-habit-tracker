import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Preset from '@/lib/models/Preset';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { presetName } = body;

    if (!presetName) {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 });
    }

    const userId = requireAuth(request);
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Direct lookup by name or type is more robust with updated presets
    const preset = await Preset.findOne({ 
      $or: [
        { name: presetName },
        { type: presetName.toLowerCase().replace(/\s+/g, '-') }
      ]
    });
    
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    const lastHabit = await Habit.findOne({ userId }).sort({ order: -1 });
    let nextOrder = lastHabit ? lastHabit.order + 1 : 0;

    const habitPromises = (preset.structure?.habits || []).map((habit: any) => 
      new Habit({
        userId,
        name: habit.name,
        category: habit.category || 'Productivity',
        type: habit.type || 'single-step',
        steps: habit.steps || [{ order: 0, name: 'Complete' }],
        order: nextOrder++,
        targetPerDay: 1,
        schedule: habit.schedule || { weekdays: true, weekends: true, custom: [] }
      }).save()
    );

    const createdHabits = await Promise.all(habitPromises);

    return NextResponse.json({
      success: true,
      message: `Protocol "${preset.name}" activated. ${createdHabits.length} habits added to your stack.`,
      habitsCreated: createdHabits.length
    });
  } catch (error: any) {
    console.error('Apply preset error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply preset' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
