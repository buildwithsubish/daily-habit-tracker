import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Preset from '@/lib/models/Preset';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import { getPhaseHabitsForDb } from '@/lib/periodization';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { presetName, phase = 1, week = 1, isDeload = false, updateExisting = true } = body;

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

    const isPplProtocol = preset.type === 'gym-ppl-protocol' || preset.name.toLowerCase().includes('ppl');

    // Get habit definitions: dynamically customized for phase & deload if PPL, or default preset structure
    const habitDefinitions = isPplProtocol
      ? getPhaseHabitsForDb(Number(phase) || 1, Boolean(isDeload), Number(week) || 1)
      : (preset.structure?.habits || []);

    if (isPplProtocol && updateExisting) {
      // Find user's existing PPL habits to update in-place without breaking streaks or creating duplicates
      const userHabits = await Habit.find({ userId });
      const lastHabit = await Habit.findOne({ userId }).sort({ order: -1 });
      let nextOrder = lastHabit ? lastHabit.order + 1 : 0;
      let updatedCount = 0;
      let createdCount = 0;

      for (const def of habitDefinitions) {
        // Match existing habit by prefix (e.g. "Day 1:", "Day 2:", "Daily ... kcal")
        const prefix = def.name.split(':')[0].trim();
        const existing = userHabits.find(h => 
          (prefix.startsWith('Day ') && h.name.startsWith(prefix)) ||
          (prefix.startsWith('Daily') && h.name.startsWith('Daily') && h.category === 'Diet')
        );

        if (existing) {
          existing.name = def.name;
          existing.steps = def.steps;
          existing.description = def.description;
          existing.descriptionEnabled = true;
          existing.advancedMode = true;
          existing.subActivities = def.subActivities;
          await existing.save();
          updatedCount++;
        } else {
          await new Habit({
            userId,
            name: def.name,
            category: def.category || 'Fitness',
            type: def.type || 'multi-step',
            steps: def.steps,
            order: nextOrder++,
            targetPerDay: 1,
            schedule: def.schedule || { weekdays: true, weekends: true, custom: [] },
            description: def.description,
            descriptionEnabled: true,
            advancedMode: true,
            subActivities: def.subActivities,
            reminderEnabled: false,
            reminderTime: '08:00',
            sendRemainder: false,
          }).save();
          createdCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: updatedCount > 0
          ? `Synced 7-day protocol to Phase ${phase} (Week ${week}${isDeload ? ' - Deload' : ''})! Updated ${updatedCount} habits.`
          : `Activated 1-Year Protocol! Added ${createdCount} habits for Phase ${phase}.`,
        habitsUpdated: updatedCount,
        habitsCreated: createdCount,
        phase,
        week,
        isDeload,
      });
    }

    const lastHabit = await Habit.findOne({ userId }).sort({ order: -1 });
    let nextOrder = lastHabit ? lastHabit.order + 1 : 0;

    const habitPromises = habitDefinitions.map((habit: any) => 
      new Habit({
        userId,
        name: habit.name,
        category: habit.category || 'Fitness',
        type: habit.type || 'single-step',
        steps: habit.steps || [{ order: 0, name: 'Complete' }],
        order: nextOrder++,
        targetPerDay: habit.targetPerDay || 1,
        schedule: habit.schedule || { weekdays: true, weekends: true, custom: [] },
        description: habit.description || '',
        descriptionEnabled: habit.descriptionEnabled || Boolean(habit.description),
        advancedMode: habit.advancedMode || false,
        subActivities: habit.subActivities || [],
        reminderEnabled: habit.reminderEnabled || false,
        reminderTime: habit.reminderTime || '08:00',
        sendRemainder: habit.sendRemainder || false,
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
