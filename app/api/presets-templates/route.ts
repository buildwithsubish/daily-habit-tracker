import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Preset from '@/lib/models/Preset';
import { initPresets } from '@/lib/db-init';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    await initPresets(); // Ensure presets exist

    const type = new URL(request.url).searchParams.get('type');
    const category = new URL(request.url).searchParams.get('category');

    const query = type ? { type } : (category ? { category } : {});
    const presets = await Preset.find(query).lean();

    // Format presets for the frontend
    const formattedPresets = presets.map(p => ({
      _id: (p._id as mongoose.Types.ObjectId).toString(),
      name: p.name,
      description: p.description,
      type: p.type,
      category: p.category,
      structure: p.structure,
      habitsCount: p.structure?.habits?.length || 0
    }));

    return NextResponse.json({
      presets: formattedPresets,
      totalPresets: formattedPresets.length
    });
  } catch (error: any) {
    console.error('Get presets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}

