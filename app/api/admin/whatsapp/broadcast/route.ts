import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import MessageLog from '@/lib/models/MessageLog';
import AuditLog from '@/lib/models/AuditLog';
import ScheduledJob from '@/lib/models/ScheduledJob';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import whatsappClientManager from '@/lib/whatsapp-web';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const rateLimitStore: RateLimitStore = {};
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_MESSAGES_PER_MINUTE = 30;

function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore[adminId];

  if (!record || now > record.resetTime) {
    rateLimitStore[adminId] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return true;
  }

  if (record.count >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkRateLimit(adminId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more messages.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { userIds, message, scheduleFor, filter } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    let targetUsers: any[] = [];

    if (userIds && userIds.length > 0) {
      targetUsers = await User.find({
        _id: { $in: userIds },
        whatsappVerified: true,
        whatsappAutomation: true,
        whatsappNumber: { $exists: true, $ne: '' },
      }).select('_id whatsappNumber username whatsappContactName');
    } else if (filter) {
      const query: any = {
        whatsappVerified: true,
        whatsappAutomation: true,
        whatsappNumber: { $exists: true, $ne: '' },
      };

      if (filter.activeOnly) {
        query.lastActive = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      }

      if (filter.category) {
        // Would need to join with habits to filter by category
      }

      targetUsers = await User.find(query).select('_id whatsappNumber username whatsappContactName');
    }

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: 'No eligible users found' },
        { status: 400 }
      );
    }

    if (scheduleFor) {
      const scheduledJob = await ScheduledJob.create({
        adminId: adminId,
        jobType: 'custom_broadcast',
        status: 'pending',
        scheduledFor: new Date(scheduleFor),
        targetUsers: targetUsers.map((u: any) => u._id),
        messageTemplate: message,
        filterCriteria: filter || {},
        recurrence: 'once',
      });

      await AuditLog.create({
        adminId: adminId,
        action: 'broadcast_scheduled',
        category: 'whatsapp_broadcast',
        details: `Broadcast scheduled for ${targetUsers.length} users`,
        metadata: { scheduleFor, userCount: targetUsers.length },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Broadcast scheduled successfully',
        scheduledJobId: scheduledJob._id,
        targetUserCount: targetUsers.length,
      });
    }

    // ✅ VERIFY WhatsApp Connection BEFORE Starting Broadcast
    console.log('[Broadcast] Verifying WhatsApp connection for adminId:', adminId);
    
    const whatsappSession = await WhatsAppSession.findOne({ 
      $or: [
        { ADMIN_SESSION_ID: adminId },
        { adminIdString: adminId },
        { adminId: adminId }
      ]
    });

    if (!whatsappSession) {
      console.error('[Broadcast] No WhatsApp session found in database');
      return NextResponse.json(
        { 
          error: 'WhatsApp not connected. Please connect WhatsApp first at /admin/whatsapp',
          details: 'No session found in database'
        },
        { status: 503 }
      );
    }

    if (whatsappSession.status !== 'connected') {
      console.error('[Broadcast] WhatsApp session status is:', whatsappSession.status);
      return NextResponse.json(
        { 
          error: `WhatsApp is currently ${whatsappSession.status}. Please reconnect at /admin/whatsapp`,
          details: `Session status: ${whatsappSession.status}, Last connected: ${whatsappSession.lastConnectedAt || 'Never'}`
        },
        { status: 503 }
      );
    }

    console.log('[Broadcast] WhatsApp session verified as connected');

    let messagesSent = 0;
    let messagesFailed = 0;
    const results: any[] = [];
    const failedDetails: string[] = [];

    for (const user of targetUsers) {
      try {
        // Use whatsappContactName if available, otherwise fall back to username
        const contactName = user.whatsappContactName || user.username;
        
        console.log(`[Broadcast] Sending message to ${contactName} (${user.whatsappNumber})`);
        
        const result = await whatsappClientManager.sendMessage(
          adminId,
          user.whatsappNumber,
          message,
          contactName
        );

        if (result.success) {
          console.log(`[Broadcast] ✅ Message sent to ${contactName}`);
          messagesSent++;
          
          await MessageLog.create({
            userId: user._id,
            type: 'broadcast',
            status: 'sent',
            content: message,
            sentAt: new Date(),
            messageId: result.messageId,
            date: new Date().toISOString().split('T')[0],
          });
        } else {
          console.error(`[Broadcast] ❌ Failed to send to ${contactName}: ${result.error}`);
          messagesFailed++;
          failedDetails.push(`${contactName}: ${result.error}`);
          
          await MessageLog.create({
            userId: user._id,
            type: 'broadcast',
            status: 'failed',
            content: message,
            failureReason: result.error,
            date: new Date().toISOString().split('T')[0],
          });
        }

        results.push({
          userId: user._id,
          phoneNumber: user.whatsappNumber,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        });

        // Add delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (error: any) {
        console.error(`[Broadcast] Exception sending to ${user.whatsappNumber}:`, error);
        messagesFailed++;
        failedDetails.push(`${user.username}: ${error.message}`);
        
        results.push({
          userId: user._id,
          phoneNumber: user.whatsappNumber,
          success: false,
          error: error.message,
        });

        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log(`[Broadcast] Complete: ${messagesSent} sent, ${messagesFailed} failed`);

    await AuditLog.create({
      adminId: adminId,
      action: 'broadcast_completed',
      category: 'whatsapp_broadcast',
      details: `Broadcast sent to ${messagesSent}/${targetUsers.length} users`,
      metadata: { messagesSent, messagesFailed, totalUsers: targetUsers.length, failedDetails },
      success: messagesSent > 0,
    });

    return NextResponse.json({
      success: messagesSent > 0,
      message: `Broadcast ${messagesSent === targetUsers.length ? 'completed successfully' : 'partially completed'}`,
      results: {
        totalUsers: targetUsers.length,
        messagesSent,
        messagesFailed,
        failedDetails: failedDetails.slice(0, 10), // Return first 10 failures
        detailedResults: results,
      },
    });
  } catch (error: any) {
    console.error('[Broadcast] Fatal Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
