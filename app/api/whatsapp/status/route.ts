import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);

    const activeSession = await WhatsAppSession.findOne({ status: 'connected' })
      .sort({ lastConnectedAt: -1 });

    const user = await User.findById(userId).select('whatsappVerified whatsappNumber');

    if (activeSession) {
      return NextResponse.json({
        status: 'connected',
        phoneNumber: activeSession.phoneNumber,
        lastConnectedAt: activeSession.lastConnectedAt,
        isVerified: user?.whatsappVerified || false,
      });
    }

    return NextResponse.json({
      status: 'disconnected',
      isVerified: user?.whatsappVerified || false,
    });
  } catch (error: any) {
    console.error('[WhatsApp Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
