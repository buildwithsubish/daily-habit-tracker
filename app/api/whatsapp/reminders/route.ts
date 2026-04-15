import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import MessageLog from '@/lib/models/MessageLog';
import { sendWhatsAppMessage, getAppreciativeMessage } from '@/lib/whatsapp';
import { getToday } from '@/lib/utils';

// Secured by API secret — called by external cron service
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const body = await request.json().catch(() => ({}));
        const secret = authHeader?.replace('Bearer ', '') || body.secret;

        if (!CRON_SECRET || secret !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const today = getToday();

        // Find all summary messages from today that haven't been responded to
        const pendingMessages = await MessageLog.find({
            date: today,
            type: 'summary',
            status: { $in: ['sent', 'delivered'] },
        }).lean();

        const results: Array<{ userId: string; action: string; remindersSent?: number }> = [];

        for (const log of pendingMessages as any[]) {
            try {
                const user = await User.findById(log.userId).lean() as any;
                if (!user || !user.whatsappAutomation || !user.whatsappNumber) {
                    results.push({ userId: log.userId.toString(), action: 'skipped_no_user' });
                    continue;
                }

                const maxReminders = user.whatsappReminderCount || 3;

                // Already exhausted reminders
                if (log.reminderCount >= maxReminders) {
                    // Escalate if not already done
                    if (!log.escalatedToAdmin) {
                        await MessageLog.findByIdAndUpdate(log._id, {
                            $set: { escalatedToAdmin: true },
                        });

                        // Create escalation log entry
                        await MessageLog.create({
                            userId: user._id,
                            type: 'escalation',
                            status: 'sent',
                            content: `⚠️ User ${user.username || user.email} has not responded to today's summary after ${maxReminders} reminders.`,
                            date: today,
                            reminderCount: 0,
                            escalatedToAdmin: true,
                        });

                        results.push({ userId: log.userId.toString(), action: 'escalated', remindersSent: log.reminderCount });
                    } else {
                        results.push({ userId: log.userId.toString(), action: 'already_escalated' });
                    }
                    continue;
                }

                // Send a reminder
                const reminderNum = log.reminderCount + 1;
                const habits = await Habit.find({ userId: user._id }).sort({ order: 1 }).lean();
                const habitNames = (habits as any[]).map((h, i) => `${i + 1}. ${h.name}`).join('\n');

                let reminderMsg = '';
                if (reminderNum === 1) {
                    reminderMsg = `⏰ *Gentle Reminder* (#${reminderNum})\n\nHey ${user.username || 'there'}! You haven't marked any habits yet today.\n\n${habitNames}\n\n_Reply with the numbers you've completed!_\n\n${getAppreciativeMessage()}`;
                } else if (reminderNum === 2) {
                    reminderMsg = `🔔 *Reminder* (#${reminderNum})\n\nDon't forget your daily rituals! Even completing just one builds momentum.\n\n${habitNames}\n\n_Reply with completed habit numbers._`;
                } else {
                    reminderMsg = `🚨 *Final Reminder* (#${reminderNum})\n\nThis is your last nudge for today. Complete what you can — any progress counts!\n\n${habitNames}\n\n_Reply with numbers or "skip" to acknowledge._`;
                }

                const contactName = user.whatsappContactName || user.username;
                const result = await sendWhatsAppMessage(user.whatsappNumber, reminderMsg, contactName);

                if (result.ok) {
                    // Update the original summary log
                    await MessageLog.findByIdAndUpdate(log._id, {
                        $inc: { reminderCount: 1 },
                    });

                    // Also create a reminder log entry
                    await MessageLog.create({
                        userId: user._id,
                        type: 'reminder',
                        status: 'sent',
                        content: reminderMsg,
                        date: today,
                        reminderCount: reminderNum,
                        messageId: (result as any).messageId || '',
                    });
                }

                results.push({
                    userId: log.userId.toString(),
                    action: result.ok ? 'reminder_sent' : 'reminder_failed',
                    remindersSent: reminderNum,
                });
            } catch (userError: any) {
                console.error(`Reminder error for user ${log.userId}:`, userError);
                results.push({ userId: log.userId.toString(), action: 'error' });
            }
        }

        return NextResponse.json({
            success: true,
            date: today,
            processed: results.length,
            remindersSent: results.filter(r => r.action === 'reminder_sent').length,
            escalated: results.filter(r => r.action === 'escalated').length,
            details: results,
        });
    } catch (error: any) {
        console.error('Reminder cron error:', error);
        return NextResponse.json(
            { error: error.message || 'Reminders failed' },
            { status: 500 }
        );
    }
}
