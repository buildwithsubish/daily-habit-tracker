import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Theme from '@/lib/models/Theme';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { themeName } = body;

    if (!themeName) {
      return NextResponse.json(
        { error: 'Theme name is required' },
        { status: 400 }
      );
    }

    // Get user from auth token or session
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Try to get from cookies as fallback
    const userId = request.cookies.get('user_id')?.value || 
                   request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Verify theme exists
    const theme = await Theme.findOne({ name: themeName });
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Update user's preferred theme
    const user = await User.findByIdAndUpdate(
      userId,
      { preferredTheme: themeName },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Notify other clients via localStorage
    const response = NextResponse.json({
      success: true,
      message: `Theme "${theme.displayName}" applied successfully!`,
      theme: {
        name: theme.name,
        displayName: theme.displayName,
        colors: theme.colors
      }
    });

    return response;
  } catch (error: any) {
    console.error('Apply theme error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply theme' },
      { status: 500 }
    );
  }
}
