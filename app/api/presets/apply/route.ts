import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Preset from '@/lib/models/Preset';
import Habit from '@/lib/models/Habit';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { presetName } = body;

    if (!presetName) {
      return NextResponse.json(
        { error: 'Preset name is required' },
        { status: 400 }
      );
    }

    // Get user from cookies
    const userId = request.cookies.get('user_id')?.value || 
                   request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find preset by type (which is the unique identifier)
    // Since our presets API returns display names, we need to map back to types
    const displayNameToTypeMap: Record<string, string> = {
      'Weekday Routine': 'weekday',
      'Sunday Routine': 'sunday',
      'Gym Workout Plan': 'gym',
      'Diet Guidelines': 'diet',
      'Morning Productivity': 'morning-productivity',
      'Evening Wind-Down': 'evening-winddown',
      'Study & Learning': 'study-learning',
      'Weight Loss Plan': 'weight-loss',
      'Mental Health & Wellness': 'mental-health',
      'Lean Bulk Diet': 'lean-bulk'
    };

    const presetType = displayNameToTypeMap[presetName] || presetName;
    const preset = await Preset.findOne({ type: presetType });
    
    if (!preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      );
    }

    // Get the highest order number for this user's habits
    const lastHabit = await Habit.findOne({ userId }).sort({ order: -1 });
    let nextOrder = lastHabit ? lastHabit.order + 1 : 0;

    // Create habits from preset
    const habitPromises = (preset.structure?.habits || []).map((habit: any) => {
      const newHabit = new Habit({
        userId,
        name: habit.name,
        category: habit.category || 'Productivity',
        type: habit.type || 'single-step',
        steps: habit.steps || [{ order: 0, name: 'Complete' }],
        order: nextOrder++,
        targetPerDay: 1,
        schedule: {
          weekdays: true,
          weekends: true,
          custom: []
        }
      });
      return newHabit.save();
    });

    const createdHabits = await Promise.all(habitPromises);

    return NextResponse.json({
      success: true,
      message: `Template "${preset.displayName}" applied successfully! Created ${createdHabits.length} habits.`,
      habitsCreated: createdHabits.length,
      preset: {
        name: preset.name,
        displayName: preset.displayName,
        type: preset.type
      }
    });
  } catch (error: any) {
    console.error('Apply preset error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply preset' },
      { status: 500 }
    );
  }
}
