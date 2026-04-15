import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getUserIdFromRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId).select('username email whatsappNumber whatsappAutomation whatsappVerified timeZone');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: userId,
      username: user.username,
      email: user.email,
      whatsappNumber: user.whatsappNumber || '',
      whatsappAutomation: user.whatsappAutomation || false,
      whatsappVerified: user.whatsappVerified || false,
      timeZone: user.timeZone || 'UTC',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
