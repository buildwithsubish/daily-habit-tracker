import { NextResponse } from 'next/server';

/** @deprecated Use POST /api/admin/setup or npm run bootstrap-admin */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated. Admin credentials are no longer loaded from .env.',
      alternatives: [
        'npm run bootstrap-admin',
        'POST /api/admin/setup (first boot only)',
        '/admin/setup',
      ],
    },
    { status: 410 }
  );
}