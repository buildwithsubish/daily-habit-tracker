import { NextRequest } from 'next/server';
import { apiError } from '@/lib/api-response';

/** @deprecated Use POST /api/admin/password */
export async function POST() {
  return apiError(
    'This endpoint is deprecated. Use POST /api/admin/password',
    'DEPRECATED',
    410
  );
}

export async function PUT() {
  return POST();
}