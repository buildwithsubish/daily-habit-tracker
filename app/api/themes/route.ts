import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Theme from '@/lib/models/Theme';
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeCustom = searchParams.get('includeCustom') === 'true';
    
    let query: any = { isCustom: false };
    
    if (includeCustom) {
      query = {};
    }
    
    if (category) {
      query.category = category;
    }
    
    const themes = await Theme.find(query).sort({ isDefault: -1, displayName: 1 });
    
    const response = NextResponse.json(themes);
    // Prevent caching to ensure fresh theme data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: any) {
    console.error('Get themes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = requireAdmin(request);
    await connectDB();
    
    const body = await request.json();
    const {
      name,
      displayName,
      description,
      category,
      colors,
      fonts,
      shadows,
      borderRadius,
      animations
    } = body;
    
    if (!name || !displayName || !category || !colors) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if theme name already exists
    const existingTheme = await Theme.findOne({ name });
    if (existingTheme) {
      return NextResponse.json(
        { error: 'Theme with this name already exists' },
        { status: 409 }
      );
    }
    
    const theme = new Theme({
      name,
      displayName,
      description: description || '',
      category,
      isDefault: false,
      isCustom: true,
      colors,
      fonts: fonts || {
        heading: 'system-ui',
        body: 'system-ui'
      },
      shadows: shadows || {
        small: '0 1px 3px rgba(0,0,0,0.12)',
        medium: '0 4px 6px rgba(0,0,0,0.1)',
        large: '0 10px 25px rgba(0,0,0,0.15)'
      },
      borderRadius: borderRadius || {
        small: '0.375rem',
        medium: '0.5rem',
        large: '0.75rem',
        full: '9999px'
      },
      animations: animations || {
        duration: '0.3s',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    });
    
    await theme.save();
    
    return NextResponse.json(theme, { status: 201 });
  } catch (error: any) {
    console.error('Create theme error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create theme' },
      { status: 500 }
    );
  }
}
