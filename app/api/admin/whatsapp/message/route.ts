import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import MessageLog from '@/lib/models/MessageLog';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import whatsappClientManager from '@/lib/whatsapp-web';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, message } = body;

    if (!userId || !message?.trim()) {
      return NextResponse.json(
        { error: 'User ID and message are required' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.whatsappVerified || !user.whatsappNumber) {
      return NextResponse.json(
        { error: 'User has not verified WhatsApp number' },
        { status: 400 }
      );
    }

    const result = await whatsappClientManager.sendMessage(
      adminId,
      user.whatsappNumber,
      message
    );

    if (result.success) {
      await MessageLog.create({
        userId,
        type: 'summary',
        status: 'sent',
        content: message,
        sentAt: new Date(),
        messageId: result.messageId,
        date: new Date().toISOString().split('T')[0],
      });

      await AuditLog.create({
        adminId,
        userId,
        action: 'individual_message_sent',
        category: 'whatsapp_message',
        details: `Message sent to user ${user.email}`,
        metadata: { messageLength: message.length },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
        messageId: result.messageId,
      });
    }

    await AuditLog.create({
      adminId,
      userId,
      action: 'individual_message_failed',
      category: 'whatsapp_message',
      details: `Failed to send message to user ${user.email}`,
      errorMessage: result.error,
      success: false,
    });

    return NextResponse.json(
      { error: result.error || 'Failed to send message' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[Individual Message] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
