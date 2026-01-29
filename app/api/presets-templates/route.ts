import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Preset from '@/lib/models/Preset';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all presets
    const presets = await Preset.find().sort({ category: 1, displayName: 1 }).limit(50);

    const response = NextResponse.json({
      presets,
      totalPresets: presets.length
    });

    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Get presets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}
