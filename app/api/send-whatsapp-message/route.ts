import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import MessageLog from '@/lib/models/MessageLog';
import { requireAuth } from '@/lib/middleware';
import { formatHabitListMessage, sendWhatsAppMessage } from '@/lib/whatsapp';
import { resolveUserPhone } from '@/lib/pii';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        // 1. Securely fetch user from session cookie. This prevents cross-user access.
        const userId = requireAuth(request);

        // 2. Fetch the user's secure automation details
        const user = await User.findById(userId).select('whatsappNumber whatsappNumberEncrypted whatsappVerified whatsappAutomation whatsappContactName username');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 3. Validate WhatsApp setup
        const phoneNumber = resolveUserPhone(user);
        if (!phoneNumber) {
            return NextResponse.json({
                error: 'No WhatsApp number linked. Please add your phone number in settings.'
            }, { status: 400 });
        }

        if (!user.whatsappVerified) {
            return NextResponse.json({
                error: 'WhatsApp number not verified. Please verify your number before sending messages.'
            }, { status: 400 });
        }

        if (!user.whatsappAutomation) {
            return NextResponse.json({
                error: 'WhatsApp automation is not enabled.'
            }, { status: 400 });
        }

        // 4. Gather active habits to send
        const habits = await Habit.find({
            userId: new mongoose.Types.ObjectId(userId)
        }).sort({ order: 1 }).lean();

        if (habits.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No habits to send.'
            });
        }

        // 5. Format the message payload
        const messageBody = formatHabitListMessage(
            habits.map((h: any) => ({ name: h.name, category: h.category }))
        );

        // 6. Create message log entry
        const messageLog = await MessageLog.create({
            userId: new mongoose.Types.ObjectId(userId),
            type: 'summary',
            status: 'scheduled',
            content: messageBody,
            date: new Date().toISOString().split('T')[0],
        });

        // 7. Dispatch message with error handling
        let result;
        try {
            result = await sendWhatsAppMessage(phoneNumber, messageBody, user.whatsappContactName || user.username);
        } catch (sendError: any) {
            console.error('[WhatsApp] Send error:', sendError);

            await MessageLog.findByIdAndUpdate(messageLog._id, {
                status: 'failed',
                error: sendError.message || 'Unknown send error',
                retryCount: 1,
            });

            return NextResponse.json({
                success: false,
                sent: false,
                provider: 'unknown',
                error: `Failed to dispatch: ${sendError.message}`,
                preview: messageBody,
            }, { status: 500 });
        }

        if (result.ok) {
            // Log successful send
            await MessageLog.findByIdAndUpdate(messageLog._id, {
                status: 'sent',
                messageId: result.messageId,
            });

            console.log(`[WhatsApp] Message sent successfully to verified account (Provider: ${result.provider})`);

            return NextResponse.json({
                success: true,
                sent: true,
                provider: result.provider,
                message: 'WhatsApp message sent successfully!',
                messageId: messageLog._id,
            });
        }

        // Log failed send with retry info
        const retryable = result.status === 429 || result.status === 503;
        await MessageLog.findByIdAndUpdate(messageLog._id, {
            status: 'failed',
            error: result.error,
            retryCount: retryable ? 0 : 3, // Reset retries for transient errors
        });

        console.error(`[WhatsApp] Message dispatch failed (Provider: ${result.provider}):`, result.error);

        return NextResponse.json({
            success: false,
            sent: false,
            provider: result.provider,
            error: `Failed to dispatch: ${result.error}`,
            preview: messageBody,
            retryable: retryable,
        }, { status: retryable ? 429 : 500 });

    } catch (error: any) {
        console.error('[WhatsApp API] Unhandled error:', error);

        return NextResponse.json(
            { error: error.message || 'Failed to dispatch WhatsApp automation.' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
