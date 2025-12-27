import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Theme from '@/lib/models/Theme';
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const theme = await Theme.findById(params.id);
    
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }
    
    const response = NextResponse.json(theme);
    // Prevent caching to ensure fresh theme data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: any) {
    console.error('Get theme error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const theme = await Theme.findById(params.id);
    
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }
    
    // Check if theme is custom (only custom themes can be edited)
    if (!theme.isCustom) {
      return NextResponse.json(
        { error: 'Cannot modify default themes' },
        { status: 403 }
      );
    }
    
    // Check if name already exists (excluding current theme)
    if (name && name !== theme.name) {
      const existingTheme = await Theme.findOne({ name, _id: { $ne: params.id } });
      if (existingTheme) {
        return NextResponse.json(
          { error: 'Theme with this name already exists' },
          { status: 409 }
        );
      }
    }
    
    // Update theme
    if (name) theme.name = name;
    if (displayName) theme.displayName = displayName;
    if (description !== undefined) theme.description = description;
    if (category) theme.category = category;
    if (colors) theme.colors = colors;
    if (fonts) theme.fonts = fonts;
    if (shadows) theme.shadows = shadows;
    if (borderRadius) theme.borderRadius = borderRadius;
    if (animations) theme.animations = animations;
    theme.updatedAt = new Date();
    
    await theme.save();
    
    return NextResponse.json(theme);
  } catch (error: any) {
    console.error('Update theme error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update theme' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminId = requireAdmin(request);
    await connectDB();
    
    const theme = await Theme.findById(params.id);
    
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }
    
    // Check if theme is custom (only custom themes can be deleted)
    if (!theme.isCustom) {
      return NextResponse.json(
        { error: 'Cannot delete default themes' },
        { status: 403 }
      );
    }
    
    await Theme.findByIdAndDelete(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete theme error:', error);
    return NextResponse.json(
      { error: 'Failed to delete theme' },
      { status: 500 }
    );
  }
}
