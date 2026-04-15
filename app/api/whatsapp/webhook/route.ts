import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import MessageLog from '@/lib/models/MessageLog';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getToday } from '@/lib/utils';
import mongoose from 'mongoose';

const COMPLETE_KEYWORDS = ['done', 'complete', 'completed', 'finished', 'yes', 'y', '1', 'done!', 'complete!'];
const HELP_KEYWORDS = ['help', 'menu', 'stop', 'unsubscribe', 'cancel'];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const from = formData.get('From')?.toString();
        const body = formData.get('Body')?.toString().trim().toLowerCase();

        if (!from || !body) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const phoneNumber = from.replace('whatsapp:', '');

        await connectDB();

        const user = await User.findOne({ whatsappNumber: phoneNumber });
        if (!user) {
            await sendWhatsAppMessage(phoneNumber, "Sorry, this phone number is not linked to a DailyHabit Flow account.");
            return NextResponse.json({ success: true });
        }

        if (!user.whatsappAutomation) {
            await sendWhatsAppMessage(phoneNumber, "WhatsApp automation is currently disabled on your account. Please enable it in your dashboard.");
            return NextResponse.json({ success: true });
        }

        const todayStr = getToday();

        // Check for help/stop commands
        if (HELP_KEYWORDS.includes(body)) {
            const helpMessage = `*📱 DailyHabit Flow Commands*\n\n` +
                `• Reply with habit numbers (e.g., "1, 2, 3") to mark them complete\n` +
                `• Reply "done" or "complete" to mark the most recent reminder as done\n` +
                `• Reply "help" to see this menu\n` +
                `• Reply "stop" to disable reminders\n\n` +
                `_Visit your dashboard to manage habit settings_`;
            await sendWhatsAppMessage(phoneNumber, helpMessage);
            return NextResponse.json({ success: true });
        }

        // Check for stop command
        if (body === 'stop' || body === 'unsubscribe') {
            user.whatsappAutomation = false;
            await user.save();
            await sendWhatsAppMessage(phoneNumber, "You've been unsubscribed from DailyHabit Flow reminders. Reply 'start' to re-enable.");
            return NextResponse.json({ success: true });
        }

        // Check for start command
        if (body === 'start' || body === 'subscribe') {
            user.whatsappAutomation = true;
            await user.save();
            const successMessage = "✅ Welcome back! WhatsApp reminders are now enabled. Reply 'help' for commands.";
            await sendWhatsAppMessage(phoneNumber, successMessage);
            return NextResponse.json({ success: true });
        }

        // Check for "done" or "complete" keywords - mark the most recent reminder as complete
        if (COMPLETE_KEYWORDS.includes(body)) {
            const recentReminder = await MessageLog.findOne({
                userId: user._id,
                date: todayStr,
                type: { $in: ['poll', 'reminder'] },
                status: 'sent',
            }).sort({ sentAt: -1 });

            if (recentReminder && recentReminder.habitId) {
                const existingLog = await DailyLog.findOne({
                    userId: user._id,
                    habitId: recentReminder.habitId,
                    date: todayStr,
                });

                if (!existingLog || !existingLog.completed) {
                    const habit = await Habit.findById(recentReminder.habitId);
                    
                    await DailyLog.findOneAndUpdate(
                        { userId: user._id, habitId: recentReminder.habitId, date: todayStr },
                        { $set: { completed: true, completedAt: new Date() } },
                        { upsert: true }
                    );

                    if (habit) {
                        await Habit.findByIdAndUpdate(habit._id, {
                            $inc: { streak: 1 },
                            $set: { lastCompletedDate: todayStr, lastResponseReceived: new Date() }
                        });
                    }

                    await MessageLog.findByIdAndUpdate(recentReminder._id, {
                        $set: { status: 'responded', respondedAt: new Date() }
                    });

                    const encouragementMessages = [
                        "Amazing work! You're building great habits! 🌟",
                        "Keep it up! Consistency is key! 🔥",
                        "Great job! One step at a time! 💪",
                        "You're doing fantastic! Keep going! ⭐",
                    ];
                    
                    const message = `✅ *Habit Completed!*\n\nGreat job! Your habit has been marked as complete!\n\n${encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)]}`;
                    await sendWhatsAppMessage(phoneNumber, message);
                    
                    return NextResponse.json({ success: true });
                } else {
                    await sendWhatsAppMessage(phoneNumber, "This habit is already completed today! Great job! 🎉");
                    return NextResponse.json({ success: true });
                }
            } else {
                await sendWhatsAppMessage(phoneNumber, "No pending reminders found. You've already completed your habits or haven't received a reminder yet today.");
                return NextResponse.json({ success: true });
            }
        }

        // Parse habit numbers (e.g., "1, 2, 3" or "1 2 3")
        const completedIndexes = body.match(/\d+/g)?.map(n => parseInt(n, 10)) || [];

        if (completedIndexes.length === 0) {
            const helpMessage = `I didn't understand that. Here's how to use DailyHabit Flow:\n\n` +
                `• Reply with habit numbers (e.g., "1, 2, 3") to mark them complete\n` +
                `• Reply "done" to mark the current reminder as done\n` +
                `• Reply "help" for more commands`;
            await sendWhatsAppMessage(phoneNumber, helpMessage);
            return NextResponse.json({ success: true });
        }

        // Find today's habits for this user
        const dayOfWeek = new Date().getDay();
        
        const allHabits = await Habit.find({ userId: user._id, active: true }).sort({ order: 1 });
        
        const habits = (allHabits as any[]).filter(h => {
          if (!h.whatsappEnabled) return false;
          if (h.whatsappFrequency === 'manual') return false;
          if (h.whatsappFrequency === 'weekly' && dayOfWeek !== 1) return false;
          return true;
        });

        if (habits.length === 0) {
            await sendWhatsAppMessage(phoneNumber, "You have no active WhatsApp habits scheduled today.");
            return NextResponse.json({ success: true });
        }

        const successfulMarks: string[] = [];

        // Link parsed indices to Habits (1-based index to 0-based array)
        for (const id of completedIndexes) {
            const idx = id - 1;
            if (idx >= 0 && idx < habits.length) {
                const targetHabit = habits[idx];

                const existingLog = await DailyLog.findOne({
                    userId: user._id,
                    habitId: targetHabit._id,
                    date: todayStr
                });

                if (!existingLog || !existingLog.completed) {
                    await DailyLog.findOneAndUpdate(
                        { userId: user._id, habitId: targetHabit._id, date: todayStr },
                        { $set: { completed: true, completedAt: new Date().toISOString() } },
                        { upsert: true }
                    );

                    await Habit.findByIdAndUpdate(targetHabit._id, {
                        $inc: { streak: 1 },
                        $set: { lastCompletedDate: todayStr, lastResponseReceived: new Date() }
                    });

                    successfulMarks.push(targetHabit.name);

                    // Mark corresponding message log as responded
                    await MessageLog.findOneAndUpdate(
                        {
                            userId: user._id,
                            habitId: targetHabit._id,
                            date: todayStr,
                            status: { $in: ['sent', 'delivered'] }
                        },
                        { $set: { status: 'responded', respondedAt: new Date() } }
                    );
                }
            }
        }

        // Build and send response report
        if (successfulMarks.length > 0) {
            const report = `🎉 *Boom!* Marked as complete:\n` + 
                successfulMarks.map(m => `✅ ${m}`).join('\n') + 
                `\n\nKeep up the great work!`;
            await sendWhatsAppMessage(phoneNumber, report);
        } else {
            await sendWhatsAppMessage(phoneNumber, "Those habits were either already marked complete or out of range. Check your dashboard for details.");
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
