import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { hashPassword, generateToken } from '@/lib/auth';
import { sanitizeInput, isValidEmail, isValidUsername, isStrongPassword } from '@/lib/security';
import rateLimiter from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter(request, 5, 60);
    if (!rate.allowed) return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
    await connectDB();
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    const { email, password, username } = body as { email?: unknown; password?: unknown; username?: unknown };
    
    // Sanitize inputs
    if (typeof email !== 'string' || typeof password !== 'string' || (username !== undefined && typeof username !== 'string') || email.length > 254 || password.length > 256 || (typeof username === 'string' && username.length > 64)) {
      return NextResponse.json({ error: 'Invalid registration details' }, { status: 400 });
    }
    const cleanEmail = sanitizeInput(email);
    const cleanUsername = username ? sanitizeInput(username) : undefined;
    
    if (!cleanEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate username if provided
    if (cleanUsername && !isValidUsername(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Enhanced password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [
      { email: cleanEmail.toLowerCase() },
        ...(cleanUsername ? [{ username: cleanUsername.toLowerCase() }] : [])
      ]
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    // Create user with encrypted password
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email: cleanEmail.toLowerCase(),
      ...(cleanUsername && { username: cleanUsername.toLowerCase() }),
      passwordHash,
    });
    
    const token = generateToken(user._id.toString());
    
    const response = NextResponse.json(
      { success: true, userId: user._id.toString() },
      { status: 201 }
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
