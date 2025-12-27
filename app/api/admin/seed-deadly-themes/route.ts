import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { seedDeadlyThemes } from '@/lib/seed-deadly-themes';

/**
 * POST /api/admin/seed-deadly-themes
 * Admin-only endpoint to seed 20-30 deadly dark themes with black and red combinations
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication (throws if not admin)
    requireAdmin(request);

    const count = await seedDeadlyThemes();

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${count} deadly dark themes`,
      themesCreated: count
    }, {
      status: 201,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error: any) {
    console.error('Seed deadly themes error:', error);
    return NextResponse.json(
      { error: 'Failed to seed themes', details: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

/**
 * GET /api/admin/seed-deadly-themes
 * Returns information about deadly themes (no-op endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication (throws if not admin)
    requireAdmin(request);

    return NextResponse.json({
      message: 'POST to this endpoint to seed deadly themes',
      description: 'Creates 20-30 dark/black/red color combination themes',
      endpoint: 'POST /api/admin/seed-deadly-themes',
      requiresAuth: true
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
