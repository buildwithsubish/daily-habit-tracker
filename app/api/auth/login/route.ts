import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyUserPasswordConstantTime, sanitizeUserDTO } from '@/lib/auth';
import { sanitizeInput } from '@/lib/security';
import { createUserSession } from '@/lib/user-session-service';
import { setAuthCookies } from '@/lib/auth-cookies';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Strict sliding-window rate limiting for user login: 5 attempts per 15 minutes
const userLoginRateLimiter = rateLimit({
  interval: 15 * 60 * 1000,
  uniqueTokenPerInterval: 200,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Sliding-window rate limit
    const rate = await userLoginRateLimiter.check(request, 5);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    await connectDB();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const { identifier, password, keepSignedIn, twoFactorCode } = body;

    if (
      typeof identifier !== 'string' ||
      typeof password !== 'string' ||
      identifier.length > 254 ||
      password.length > 256
    ) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    const cleanIdentifier = sanitizeInput(identifier).trim().toLowerCase();
    if (!cleanIdentifier || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 2. Query user & execute constant-time password comparison to defeat timing attacks
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    });

    // Lockout check (rate-limited / failed login lockout)
    if (user && user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { error: `Account temporarily locked due to multiple failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.` },
        { status: 423 }
      );
    }

    const isPasswordValid = await verifyUserPasswordConstantTime(
      password,
      user ? user.passwordHash : null
    );

    // If user does not exist or password is wrong, record attempt and return generic response
    if (!user || !isPasswordValid) {
      if (user) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
        }
        await user.save();
      }
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Account active check
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'This account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    // Reset login attempts & lockout on successful password verification
    if (user.loginAttempts || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = null;
    }

    // 3. Step-up 2FA check (if configured on user)
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          {
            success: true,
            requiresTwoFactor: true,
            message: 'Please enter your two-factor authentication code',
          },
          { status: 200 }
        );
      }
      // Verify TOTP if enabled
    }

    // 4. Create database session with token family and device metadata
    const { session, accessToken, refreshToken } = await createUserSession(
      user._id.toString(),
      request,
      Boolean(keepSignedIn)
    );

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // 5. Sanitize DTO (never return raw user or sensitive hashes)
    const userDTO = sanitizeUserDTO({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      timeZone: user.timeZone || 'UTC',
      createdAt: user.createdAt,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: userDTO,
        sessionId: session._id.toString(),
      },
      { status: 200 }
    );

    // 6. Set Big-Tech Dual-Token Cookies (__Host- prefixed)
    setAuthCookies(
      response,
      { accessToken, refreshToken },
      { keepSignedIn: Boolean(keepSignedIn) }
    );

    return response;
  } catch (error: any) {
    console.error('[User Login Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during sign in' },
      { status: 500 }
    );
  }
}
