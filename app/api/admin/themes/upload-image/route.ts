import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';

/**
 * POST /api/admin/themes/upload-image
 * Admin-only endpoint to upload theme images (background or accent)
 * Converts images to base64 to store directly in database
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication (throws if not admin)
    requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'background' | 'accent';

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!['background', 'accent'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "background" or "accent"' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than 5MB. Received ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json(
      {
        success: true,
        imageUrl: dataUrl,
        type,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      },
      { 
        status: 200,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }
    );
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS and preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Cache-Control': 'no-cache'
    }
  });
}
