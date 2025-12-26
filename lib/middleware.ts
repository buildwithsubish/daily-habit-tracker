import { NextRequest } from 'next/server';
import { verifyToken } from './auth';

export function getUserIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) return null;
  
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export function requireAuth(request: NextRequest): string {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

