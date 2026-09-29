import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/lib/models/User';
import MessageLog from '@/lib/models/MessageLog';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { resolveUserPhone } from '@/lib/pii';

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

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }
    if (message.length > 4096) {
      return NextResponse.json({ error: 'Message cannot exceed 4096 characters' }, { status: 400 });
    }
    if (userIds !== undefined && (!Array.isArray(userIds) || userIds.some((id: unknown) => !mongoose.isValidObjectId(id)))) {
      return NextResponse.json({ error: 'User IDs must be a list of valid IDs' }, { status: 400 });
    }
    if (userIds?.length > MAX_MESSAGES_PER_MINUTE) {
      return NextResponse.json({ error: `A single API request can target at most ${MAX_MESSAGES_PER_MINUTE} users.` }, { status: 413 });
    }
    if (filter !== undefined && (!filter || typeof filter !== 'object' || Array.isArray(filter))) {
      return NextResponse.json({ error: 'Filter must be an object' }, { status: 400 });
    }
    if (filter?.category) {
      return NextResponse.json({ error: 'Category-based broadcasts are not supported by this API' }, { status: 400 });
    }

    if (scheduleFor) {
      return NextResponse.json(
        { success: false, error: 'Scheduled WhatsApp sends are disabled. Call this API when you are ready to send.' },
        { status: 410 }
      );
    }

    let targetUsers: any[] = [];

    if (userIds && userIds.length > 0) {
      targetUsers = await User.find({
        _id: { $in: userIds },
        whatsappVerified: true,
        whatsappNumber: { $exists: true, $ne: '' },
        // Note: do not require whatsappAutomation here - manual broadcasts can target any verified user
      }).select('_id whatsappNumber whatsappNumberEncrypted username whatsappContactName').limit(MAX_MESSAGES_PER_MINUTE + 1);
    } else if (filter) {
      const query: any = {
        whatsappVerified: true,
        whatsappNumber: { $exists: true, $ne: '' },
      };

      // Only require automation if explicitly filtering for automation-enabled users
      if (filter.whatsappAutomation === true) {
        query.whatsappAutomation = true;
      }

      if (filter.activeOnly) {
        query.lastActive = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      }

      targetUsers = await User.find(query).select('_id whatsappNumber whatsappNumberEncrypted username whatsappContactName').limit(MAX_MESSAGES_PER_MINUTE + 1);
    }

    // De-duplicate target users by whatsappNumber (do this before the eligibility check)
    const seenNumbers = new Set<string>();
    targetUsers = targetUsers.map((user: any) => ({ ...user, deliveryPhone: resolveUserPhone(user) })).filter((user: any) => {
      const number = user.deliveryPhone;
      if (!number || seenNumbers.has(number)) {
        return false;
      }
      seenNumbers.add(number);
      return true;
    });

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No eligible users found for broadcast',
          details: 'No users matched the criteria. Users must have whatsappVerified=true and a valid whatsappNumber. When using the "Automation" recipient filter, they must also have whatsappAutomation enabled. Check user profiles or try "Verified" / "Selected" options.'
        },
        { status: 400 }
      );
    }
    if (targetUsers.length > MAX_MESSAGES_PER_MINUTE) {
      return NextResponse.json(
        { success: false, error: `A single API request can send to at most ${MAX_MESSAGES_PER_MINUTE} users.` },
        { status: 413 }
      );
    }

    // Process each recipient sequentially so the API response reports actual delivery results.
    let messagesSent = 0;
    let messagesFailed = 0;
    const results: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const user of targetUsers) {
      let messageLog: any = null;
      try {
        const contactName = user.whatsappContactName || user.username || '';
        messageLog = await MessageLog.create({
          userId: user._id,
          type: 'broadcast',
          status: 'pending',
          content: message,
          date: today,
        });

        const sendResult = await sendWhatsAppMessage(user.deliveryPhone, message, contactName);
        await MessageLog.findByIdAndUpdate(messageLog._id, {
          $set: sendResult.ok
            ? { status: 'sent', sentAt: new Date(), messageId: sendResult.messageId }
            : { status: 'failed', error: sendResult.error },
        });
        if (sendResult.ok) messagesSent++;
        else messagesFailed++;
        results.push({
          userId: user._id,
          success: sendResult.ok,
          ...(sendResult.ok ? { messageId: sendResult.messageId } : { error: sendResult.error }),
        });
      } catch (error: any) {
        console.error(`[Broadcast] Send failed for ${user.username || user._id}:`, error);
        messagesFailed++;
        if (messageLog && messageLog._id) {
          try {
            await MessageLog.findByIdAndUpdate(messageLog._id, {
              status: 'failed',
              error: error.message || 'Send failed',
            });
          } catch { /* A failed log update must not stop other recipients. */ }
        }

        results.push({
          userId: user._id,
          success: false,
          error: error.message || 'Send failed',
        });
      }
    }

    console.log(`[Broadcast] Sent: ${messagesSent}, failed: ${messagesFailed}`);

    await AuditLog.create({
      adminId: adminId,
      action: 'broadcast_sent',
      category: 'whatsapp_broadcast',
      details: `Broadcast sent to ${messagesSent}/${targetUsers.length} users`,
      metadata: { sent: messagesSent, failed: messagesFailed, totalUsers: targetUsers.length },
      success: messagesSent > 0,
    });

    return NextResponse.json({
      success: messagesSent > 0,
      message: `Broadcast finished: ${messagesSent} sent, ${messagesFailed} failed.`,
      results: {
        totalUsers: targetUsers.length,
        messagesSent: messagesSent,
        messagesFailed: messagesFailed,
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
