import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Theme from '@/lib/models/Theme';
import { requireAdmin } from '@/lib/admin-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params (for different Next.js versions)
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Verify admin
    requireAdmin(request);
    
    await connectDB();

    const body = await request.json();
    const { themeId } = body;

    if (!themeId) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
        { status: 400 }
      );
    }

    // Verify theme exists
    const theme = await Theme.findById(themeId);
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const user = await User.findById(resolvedParams.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user's preferred theme
    user.preferredTheme = themeId;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Theme "${theme.displayName}" assigned to user ${user.email}`,
      user: {
        id: user._id,
        email: user.email,
        preferredTheme: user.preferredTheme,
      },
      theme: {
        id: theme._id,
        name: theme.name,
        displayName: theme.displayName,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Assign theme to user error:', error);
    return NextResponse.json(
      { error: 'Failed to assign theme' },
      { status: 500 }
    );
  }
}
