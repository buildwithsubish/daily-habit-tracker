import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

/**
 * GET - Check verification status
 * Query params: userId (optional, defaults to authenticated user)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { requireAuth } = await import('@/lib/middleware');
    const userId = requireAuth(request);

    const user = await User.findById(userId).select(
      'whatsappNumber whatsappVerified whatsappAutomation whatsappContactName'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      whatsappNumber: user.whatsappNumber || null,
      whatsappVerified: user.whatsappVerified || false,
      whatsappAutomation: user.whatsappAutomation || false,
      whatsappContactName: user.whatsappContactName || null,
    });
  } catch (error: any) {
    console.error('Verification status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check verification status' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST - Send verification code to phone number
 * Body: { phoneNumber: string }
 * 
 * Checks if user already has a verified number to avoid re-verification
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { phoneNumber } = await request.json();

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // First, check if user already has a verified number stored in DB
    const existingUser = await User.findById(userId).select(
      'whatsappNumber whatsappVerified whatsappNumberHash'
    );

    // If user already has a verified number stored, don't ask for verification again
    if (existingUser && existingUser.whatsappVerified && existingUser.whatsappNumber) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Phone number is already verified',
        whatsappNumber: existingUser.whatsappNumber,
      });
    }

    // Validate phone number format (basic validation)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with verification code
    await User.findByIdAndUpdate(userId, {
      whatsappNumber: phoneNumber,
      whatsappVerificationCode: verificationCode,
      whatsappVerificationExpiry: expiryTime,
      whatsappVerified: false,
    });

    // Send verification code via WhatsApp
    const message = `Your Daily Habit Tracker verification code is: *${verificationCode}*\n\nThis code expires in 10 minutes.`;

    const user = await User.findById(userId).select('whatsappContactName username');
    const contactName = user?.whatsappContactName || user?.username || undefined;
    const result = await sendWhatsAppMessage(phoneNumber, message, contactName);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully',
        messageId: result.messageId,
      });
    }

    // If sending failed, still return success but indicate message delivery issue
    return NextResponse.json({
      success: false,
      message: `Verification code generated but could not be sent: ${result.error}`,
      error: result.error,
    }, { status: 400 });
  } catch (error: any) {
    console.error('Verification code send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send verification code' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

/**
 * PUT - Verify the code entered by user
 * Body: { verificationCode: string }
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { verificationCode } = await request.json();

    if (!verificationCode || !verificationCode.trim()) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select(
      'whatsappVerificationCode whatsappVerificationExpiry whatsappNumber whatsappVerified'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If already verified, just return success
    if (user.whatsappVerified) {
      return NextResponse.json({
        success: true,
        message: 'Phone number is already verified',
        whatsappNumber: user.whatsappNumber,
      });
    }

    // Check if verification code exists
    if (!user.whatsappVerificationCode) {
      return NextResponse.json(
        { error: 'No verification code requested. Please request a new code first.' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (new Date() > new Date(user.whatsappVerificationExpiry)) {
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Verify code
    if (user.whatsappVerificationCode !== verificationCode.trim()) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark as verified
    await User.findByIdAndUpdate(userId, {
      whatsappVerified: true,
      whatsappVerificationCode: '',
      whatsappVerificationExpiry: null,
    });

    // Send confirmation message
    const confirmationMessage = `✅ Your WhatsApp number has been verified for Daily Habit Tracker!\n\nYou can now use automated habit reminders and tracking.`;
await sendWhatsAppMessage(user.whatsappNumber, confirmationMessage, user.whatsappContactName || user.username);

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      whatsappNumber: user.whatsappNumber,
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify code' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
