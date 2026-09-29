import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import MessageLog from '@/lib/models/MessageLog';
import { requireAuth } from '@/lib/middleware';
import { formatHabitListMessage, sendWhatsAppMessage } from '@/lib/whatsapp';
import { buildUserPhoneStorage, resolveUserPhone } from '@/lib/pii';
import { maskPhoneNumber } from '@/lib/security';
import mongoose from 'mongoose';

// GET - Check WhatsApp automation status
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const userId = requireAuth(request);

        const user = await User.findById(userId).select('whatsappNumber whatsappNumberEncrypted whatsappVerified whatsappAutomation');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            whatsappNumber: resolveUserPhone(user) ? maskPhoneNumber(resolveUserPhone(user)!) : '',
            whatsappVerified: user.whatsappVerified || false,
            whatsappAutomation: user.whatsappAutomation || false,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch WhatsApp settings' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

// POST - Update WhatsApp settings and optionally send message
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const userId = requireAuth(request);
        const data = await request.json();

        const { whatsappNumber, whatsappAutomation, sendNow } = data;

        // Validate number if being set
        if (whatsappNumber !== undefined && typeof whatsappNumber !== 'string') {
            return NextResponse.json({ error: 'WhatsApp number must be text' }, { status: 400 });
        }
        if (whatsappNumber && whatsappNumber.trim()) {
            const cleanNumber = whatsappNumber.replace(/\D/g, '');
            if (cleanNumber.length < 10 || cleanNumber.length > 15) {
                return NextResponse.json(
                    { error: 'Invalid phone number format' },
                    { status: 400 }
                );
            }
        }

        // Update user WhatsApp settings
        const currentUser = await User.findById(userId).select('whatsappNumber whatsappNumberEncrypted whatsappVerified');
        const currentPhone = resolveUserPhone(currentUser);
        const incomingPhone = typeof whatsappNumber === 'string' ? whatsappNumber.replace(/\D/g, '') : undefined;
        const updateData: any = {};
        if (whatsappNumber !== undefined) {
            if (incomingPhone) {
                Object.assign(updateData, buildUserPhoneStorage(incomingPhone));
                if (incomingPhone !== currentPhone) {
                    updateData.whatsappVerified = false;
                    updateData.whatsappAutomation = false;
                }
            } else {
                Object.assign(updateData, { whatsappNumber: '', whatsappNumberEncrypted: '', whatsappNumberHash: '', whatsappVerified: false, whatsappAutomation: false });
            }
        }
        if (whatsappAutomation !== undefined) {
            if (typeof whatsappAutomation !== 'boolean') return NextResponse.json({ error: 'WhatsApp automation must be a boolean' }, { status: 400 });
            if (whatsappAutomation && !currentUser?.whatsappVerified) return NextResponse.json({ error: 'Verify the WhatsApp number before enabling automation' }, { status: 400 });
            updateData.whatsappAutomation = whatsappAutomation;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // If sendNow is true, number is set, and automation is enabled, fetch habits and prepare message
        const phoneForDelivery = resolveUserPhone(updatedUser);
        if (sendNow && phoneForDelivery && updatedUser.whatsappVerified && updatedUser.whatsappAutomation) {
            const habits = await Habit.find({
                userId: new mongoose.Types.ObjectId(userId)
            }).sort({ order: 1 }).lean();

            if (habits.length === 0) {
                return NextResponse.json({
                    success: true,
                    message: 'Settings updated. No habits to send.'
                });
            }

            const messageBody = formatHabitListMessage(
                habits.map((h: any) => ({ name: h.name, category: h.category }))
            );

            // Log the message
            const messageLog = await MessageLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                type: 'summary',
                status: 'scheduled',
                content: messageBody,
                date: new Date().toISOString().split('T')[0],
            });

            // Get user to get contact name
            const user = await User.findById(userId).select('whatsappContactName username');
            const contactName = user?.whatsappContactName || user?.username || undefined;
            
            const result = await sendWhatsAppMessage(phoneForDelivery, messageBody, contactName);

            if (result.ok) {
                // Update message log with success
                await MessageLog.findByIdAndUpdate(messageLog._id, {
                    status: 'sent',
                    messageId: result.messageId,
                });

                return NextResponse.json({
                    success: true,
                    sent: true,
                    provider: result.provider,
                    message: 'WhatsApp message sent successfully!',
                });
            }

            // Update message log with error
            await MessageLog.findByIdAndUpdate(messageLog._id, {
                status: 'failed',
                error: result.error,
            });

            return NextResponse.json({
                success: true,
                sent: false,
                provider: result.provider,
                message: `Settings saved. Message sending not enabled: ${result.error}`,
                preview: messageBody,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'WhatsApp settings updated successfully'
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update WhatsApp settings' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
