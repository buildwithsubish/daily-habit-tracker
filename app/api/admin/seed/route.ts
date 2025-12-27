import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { seedThemesSimple } from '@/lib/seed-themes-simple';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    requireAdmin(request);

    // Seed the database
    const result = await seedThemesSimple();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Seed database error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed database' },
      { status: 500 }
    );
  }
}
