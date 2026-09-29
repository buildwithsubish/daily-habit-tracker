import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyPassword, generateToken } from '@/lib/auth';
import { sanitizeInput } from '@/lib/security';
import rateLimiter from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter(request, 10, 60);
    if (!rate.allowed) return NextResponse.json({ error: 'Too many sign-in attempts. Try again later.' }, { status: 429 });
    await connectDB();
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    const { identifier, password } = body as { identifier?: unknown; password?: unknown };
    
    // Sanitize inputs
    if (typeof identifier !== 'string' || typeof password !== 'string' || identifier.length > 254 || password.length > 256) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }
    const cleanIdentifier = sanitizeInput(identifier);
    
    if (!cleanIdentifier || !password) {
      return NextResponse.json(
        { error: 'Identifier and password are required' },
        { status: 400 }
      );
    }
    
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { username: cleanIdentifier.toLowerCase() }
      ]
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const token = generateToken(user._id.toString());
    
    const response = NextResponse.json(
      { success: true, userId: user._id.toString() },
      { status: 200 }
    );
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
