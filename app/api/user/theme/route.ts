import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user from cookies
    const userId = request.cookies.get('user_id')?.value || 
                   request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { theme: 'classic-light', message: 'Using default theme' },
        { status: 200 }
      );
    }

    // Get user's preferred theme
    const user = await User.findById(userId).select('preferredTheme');
    
    if (!user) {
      return NextResponse.json(
        { theme: 'classic-light', message: 'User not found' },
        { status: 200 }
      );
    }

    const response = NextResponse.json({
      theme: user.preferredTheme || 'classic-light',
      success: true
    });

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Get user theme error:', error);
    return NextResponse.json(
      { theme: 'classic-light', error: error.message },
      { status: 200 }
    );
  }
}
