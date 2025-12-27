import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Theme from '@/lib/models/Theme';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user from token - try multiple token sources
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value;

    // If no token, return default theme without error (for unauthenticated users)
    if (!token) {
      const defaultTheme = await Theme.findOne({ isDefault: true });
      return NextResponse.json({
        preferredTheme: null,
        theme: defaultTheme,
        authenticated: false,
        message: 'Not authenticated - using default theme'
      }, { status: 200 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      // Token invalid, return default theme instead of error
      const defaultTheme = await Theme.findOne({ isDefault: true });
      return NextResponse.json({
        preferredTheme: null,
        theme: defaultTheme,
        authenticated: false,
        message: 'Invalid token - using default theme'
      }, { status: 200 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      // User not found, return default theme
      const defaultTheme = await Theme.findOne({ isDefault: true });
      return NextResponse.json({
        preferredTheme: null,
        theme: defaultTheme,
        authenticated: false,
        message: 'User not found - using default theme'
      }, { status: 200 });
    }

    // Get the user's theme
    let theme = null;
    if (user.preferredTheme) {
      // Try to find by name first (since preferredTheme is often a string name)
      theme = await Theme.findOne({ name: user.preferredTheme });
      // If not found by name, try by ID
      if (!theme && user.preferredTheme.length === 24) {
        try {
          theme = await Theme.findById(user.preferredTheme);
        } catch (e) {
          // ID cast failed, theme not found by ID
          theme = null;
        }
      }
    }

    // If no user theme, get default theme
    if (!theme) {
      theme = await Theme.findOne({ isDefault: true });
    }

    return NextResponse.json({
      preferredTheme: user.preferredTheme || null,
      theme: theme,
      authenticated: true,
    });
  } catch (error: any) {
    console.error('Get user theme error:', error);
    // On error, return default theme instead of 500 error
    try {
      await connectDB();
      const defaultTheme = await Theme.findOne({ isDefault: true });
      return NextResponse.json({
        preferredTheme: null,
        theme: defaultTheme,
        authenticated: false,
        error: 'Failed to fetch user theme - using default'
      }, { status: 200 });
    } catch (dbError) {
      // Even database connection failed, return minimal response
      return NextResponse.json({
        preferredTheme: null,
        theme: null,
        authenticated: false,
        error: 'Database unavailable'
      }, { status: 200 });
    }
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    // Get user from token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { themeId, useDefault } = body;

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If useDefault is true, clear the preferred theme
    if (useDefault) {
      user.preferredTheme = null;
      await user.save();

      // Get and return the default theme
      const defaultTheme = await Theme.findOne({ isDefault: true });
      return NextResponse.json({
        success: true,
        message: 'Theme reverted to default',
        theme: defaultTheme,
      });
    }

    // Validate theme exists
    const theme = await Theme.findById(themeId);
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Update user's preferred theme
    user.preferredTheme = themeId;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Theme "${theme.displayName}" applied successfully`,
      theme: theme,
    });
  } catch (error: any) {
    console.error('Update user theme error:', error);
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}
