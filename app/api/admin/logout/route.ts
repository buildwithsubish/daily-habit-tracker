import { NextRequest, NextResponse } from 'next/server';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const adminId = getAdminIdFromRequest(request);
    
    if (adminId) {
      // Log the logout action
      await AuditLog.create({
        adminId,
        action: 'logout',
        category: 'admin_auth',
        details: 'Admin logged out',
        success: true,
      });
    }
    
    const response = NextResponse.json({ success: true });
    
    // Clear all admin cookies
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    
    response.cookies.set('admin_refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    console.error('Admin logout error:', error);
    
    // Still clear cookies even on error
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('admin_refresh_token', '', { maxAge: 0, path: '/' });
    
    return response;
  }
}
