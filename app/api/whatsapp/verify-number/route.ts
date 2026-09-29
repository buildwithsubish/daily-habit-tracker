import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware';
import { buildUserPhoneStorage, resolveUserPhone } from '@/lib/pii';
import { maskPhoneNumber } from '@/lib/security';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);

    const user = await User.findById(userId).select(
      'whatsappNumber whatsappNumberEncrypted whatsappVerified whatsappAutomation whatsappContactName'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const phone = resolveUserPhone(user);

    return NextResponse.json({
      whatsappNumber: phone ? maskPhoneNumber(phone) : null,
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

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { phoneNumber } = await request.json();

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const existingUser = await User.findById(userId).select(
      'whatsappNumber whatsappNumberEncrypted whatsappVerified whatsappNumberHash'
    );

    if (existingUser?.whatsappVerified && resolveUserPhone(existingUser)) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Phone number is already verified',
      });
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const verificationCode = generateVerificationCode();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
    const pendingStorage = buildUserPhoneStorage(cleanNumber);

    await User.findByIdAndUpdate(userId, {
      ...pendingStorage,
      whatsappVerificationCode: verificationCode,
      whatsappVerificationExpiry: expiryTime,
      whatsappVerified: false,
    });

    const message = `Your Daily Habit Tracker verification code is: *${verificationCode}*\n\nThis code expires in 10 minutes.`;

    const user = await User.findById(userId).select('whatsappContactName username');
    const contactName = user?.whatsappContactName || user?.username || undefined;
    const result = await sendWhatsAppMessage(cleanNumber, message, contactName);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully',
        messageId: result.messageId,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: `Verification code generated but could not be sent: ${result.error}`,
        error: result.error,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Verification code send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send verification code' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { verificationCode } = await request.json();

    if (!verificationCode || !verificationCode.trim()) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const user = await User.findById(userId).select(
      'whatsappVerificationCode whatsappVerificationExpiry whatsappNumber whatsappNumberEncrypted whatsappVerified whatsappContactName username'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.whatsappVerified) {
      return NextResponse.json({ success: true, message: 'Phone number is already verified' });
    }

    if (!user.whatsappVerificationCode) {
      return NextResponse.json(
        { error: 'No verification code requested. Please request a new code first.' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(user.whatsappVerificationExpiry)) {
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (user.whatsappVerificationCode !== verificationCode.trim()) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    await User.findByIdAndUpdate(userId, {
      whatsappVerified: true,
      whatsappVerificationCode: '',
      whatsappVerificationExpiry: null,
    });

    const phone = resolveUserPhone(user);
    if (phone) {
      const confirmationMessage =
        '✅ Your WhatsApp number has been verified for Daily Habit Tracker!\n\nYou can now use automated habit reminders and tracking.';
      await sendWhatsAppMessage(phone, confirmationMessage, user.whatsappContactName || user.username);
    }

    return NextResponse.json({ success: true, message: 'Phone number verified successfully' });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify code' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}