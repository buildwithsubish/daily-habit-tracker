import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from './admin-auth';

export function getAdminIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return null;
  
  const decoded = verifyAdminToken(token);
  return decoded?.adminId || null;
}

export function requireAdmin(request: NextRequest): string {
  const adminId = getAdminIdFromRequest(request);
  if (!adminId) {
    throw new Error('Unauthorized');
  }
  return adminId;
}

