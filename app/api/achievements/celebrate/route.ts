import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { achievementId } = await request.json();

    if (!achievementId) {
      return NextResponse.json({ error: 'Achievement ID is required' }, { status: 400 });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { celebratedAchievements: achievementId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Celebrate API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record celebration' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
