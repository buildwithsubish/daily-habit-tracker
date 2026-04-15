import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import { requireAuth } from '@/lib/middleware';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.whatsappNumber || !user.whatsappVerified) {
      return NextResponse.json(
        { error: 'WhatsApp number not verified' },
        { status: 400 }
      );
    }

    const activeSession = await WhatsAppSession.findOne({ status: 'connected' });

    if (!activeSession) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please ask admin to connect.' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage(user.whatsappNumber, message, user.whatsappContactName || undefined);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully',
      });
    } else {
      return NextResponse.json({
        error: result.error || 'Failed to send message',
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[WhatsApp Send Test] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test message' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
