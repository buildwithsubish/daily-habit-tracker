import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Preset from '@/lib/models/Preset';
import Habit from '@/lib/models/Habit';
import { requireAuth } from '@/lib/middleware';
import { initPresets } from '@/lib/db-init';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    await initPresets(); // Ensure presets exist
    
    const type = new URL(request.url).searchParams.get('type');
    
    const query = type ? { type } : {};
    const presets = await Preset.find(query).lean();
    
    type PresetLean = { 
      _id: mongoose.Types.ObjectId; 
      name: string; 
      type: string; 
      structure: any;
    };
    const typedPresets = presets as unknown as PresetLean[];
    
    const formattedPresets = typedPresets.map(p => ({
      id: p._id.toString(),
      name: p.name,
      type: p.type,
      structure: p.structure,
    }));
    
    return NextResponse.json({ presets: formattedPresets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { presetId } = await request.json();
    
    if (!presetId) {
      return NextResponse.json(
        { error: 'Preset ID is required' },
        { status: 400 }
      );
    }
    
    const preset = await Preset.findById(presetId);
    
    if (!preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      );
    }
    
    // Create habits from preset
    const createdHabits = [];
    for (const habitTemplate of preset.structure.habits) {
      const habit = await Habit.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: habitTemplate.name,
        category: habitTemplate.category,
        type: habitTemplate.type,
        steps: habitTemplate.steps,
        targetPerDay: 1,
        schedule: { weekdays: true, weekends: true },
      });
      
      createdHabits.push(habit._id.toString());
    }
    
    return NextResponse.json({ 
      success: true, 
      habitIds: createdHabits 
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to apply preset' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
