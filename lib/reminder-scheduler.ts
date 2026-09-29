import connectDB from './mongodb';
import User from './models/User';
import Habit from './models/Habit';
import DailyLog from './models/DailyLog';
import MessageLog from './models/MessageLog';
import AuditLog from './models/AuditLog';
import { sendWhatsAppMessage, formatHabitListMessage } from './whatsapp';
import mongoose from 'mongoose';

import { getPythonWhatsAppClient } from './python-whatsapp-client';

const DEFAULT_REMINDER_MESSAGES = [
  "Hey! Don't forget to complete {habit} today! 💪",
  "Quick reminder: {habit} is waiting for you! 🎯",
  "One last push! Complete {habit} now! 🚀",
  "Time to shine! {habit} is ready for you! ⭐",
  "Don't break the streak! Complete {habit} now! 🔥",
  "Your future self will thank you for doing {habit}! 🌟",
  "Small step, big difference! Complete {habit}! 🚀",
  "One more done! Mark {habit} as complete! ✅",
  "Almost there! Finish {habit} now! ⏰",
  "Keep your streak alive! Complete {habit}! 🎉",
];

const POLL_QUESTIONS = [
  "What habits have you completed today?",
  "Which tasks did you finish?",
  "Tell me your completed habits!",
  "What did you accomplish?",
  "Share your progress!",
];

function getRandomMessage(messages: string[], habitName: string): string {
  const message = messages[Math.floor(Math.random() * messages.length)];
  return message.replace(/{habit}/g, habitName);
}

function getRandomPollQuestion(): string {
  return POLL_QUESTIONS[Math.floor(Math.random() * POLL_QUESTIONS.length)];
}

async function pythonApiRequest<T>(endpoint: string, method: string = 'GET', body?: unknown): Promise<T> {
  return getPythonWhatsAppClient().request<T>(endpoint, method, body);
}

export async function sendHabitPoll(
  habitId: string,
  userId: string,
  habitName: string,
  adminId: string = 'default'
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user || !user.whatsappNumber || !user.whatsappVerified) {
      return { success: false, error: 'User WhatsApp not verified' };
    }

    const pollQuestion = getRandomPollQuestion();
    const today = new Date().toISOString().split('T')[0];

    const existingPoll = await MessageLog.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      habitId: new mongoose.Types.ObjectId(habitId),
      date: today,
      type: 'poll',
      status: { $in: ['sent', 'completed'] },
    });

    if (existingPoll) {
      console.log(`[Poll] Poll already sent for habit ${habitName} today`);
      return { success: true, error: 'Poll already sent today' };
    }

    const messageLog = await MessageLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      habitId: new mongoose.Types.ObjectId(habitId),
      type: 'poll',
      status: 'scheduled',
      content: pollQuestion,
      scheduledFor: new Date(),
      date: today,
    });

    const habitMessage = `📋 *${pollQuestion}*\n\nHabit: ${habitName}\n\n_Reply with "done" or "complete" when finished!_`;
    const contactName = user.whatsappContactName || user.username;
    const result = await sendWhatsAppMessage(user.whatsappNumber, habitMessage, contactName);

    if (result.ok) {
      await MessageLog.findByIdAndUpdate(messageLog._id, {
        status: 'sent',
        sentAt: new Date(),
        messageId: result.messageId,
      });

      console.log(`[Poll] Poll sent for habit "${habitName}" to ${user.whatsappNumber}`);
      return { success: true };
    } else {
      await MessageLog.findByIdAndUpdate(messageLog._id, {
        status: 'failed',
        error: result.error,
      });

      console.error(`[Poll] Failed to send poll for "${habitName}": ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[Poll] Error sending poll:', error);
    return { success: false, error: error.message };
  }
}

export async function sendHabitReminder(
  habitId: string,
  userId: string,
  messageIndex: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const habit = await Habit.findById(habitId);
    if (!habit) {
      return { success: false, error: 'Habit not found' };
    }

    const user = await User.findById(userId);
    if (!user || !user.whatsappNumber || !user.whatsappVerified) {
      return { success: false, error: 'User WhatsApp not verified' };
    }

    const messages = habit.reminderMessages && habit.reminderMessages.length > 0
      ? habit.reminderMessages
      : DEFAULT_REMINDER_MESSAGES;
    
    const message = getRandomMessage(messages, habit.name);
    const today = new Date().toISOString().split('T')[0];

    const messageLog = await MessageLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      habitId: new mongoose.Types.ObjectId(habitId),
      type: 'reminder',
      status: 'scheduled',
      content: message,
      scheduledFor: new Date(),
      date: today,
      reminderCount: messageIndex + 1,
    });

    const contactName = user.whatsappContactName || user.username;
    const result = await sendWhatsAppMessage(user.whatsappNumber, message, contactName);

    if (result.ok) {
      await MessageLog.findByIdAndUpdate(messageLog._id, {
        status: 'sent',
        sentAt: new Date(),
        messageId: result.messageId,
      });

      await Habit.findByIdAndUpdate(habitId, {
        lastReminderSent: new Date(),
      });

      await AuditLog.create({
        userId: new mongoose.Types.ObjectId(userId),
        action: 'habit_reminder_sent',
        category: 'whatsapp_message',
        details: `Reminder ${messageIndex + 1} sent for habit: ${habit.name}`,
        metadata: { habitId, messageIndex, messageId: result.messageId },
        success: true,
      });

      console.log(`[Reminder] Sent reminder ${messageIndex + 1} for "${habit.name}" to ${user.whatsappNumber}`);
      return { success: true };
    } else {
      await MessageLog.findByIdAndUpdate(messageLog._id, {
        status: 'failed',
        error: result.error,
      });

      console.error(`[Reminder] Failed to send reminder for "${habit.name}": ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[Reminder] Error sending reminder:', error);
    return { success: false, error: error.message };
  }
}

export async function handleHabitCompletionResponse(
  userId: string,
  habitId: string,
  adminId: string = 'default'
): Promise<{ success: boolean; message?: string }> {
  try {
    await connectDB();

    const habit = await Habit.findById(habitId);
    if (!habit) {
      return { success: false, message: 'Habit not found' };
    }

    const today = new Date().toISOString().split('T')[0];

    const existingLog = await DailyLog.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      habitId: new mongoose.Types.ObjectId(habitId),
      date: today,
    });

    if (existingLog && existingLog.completed) {
      return { success: true, message: 'Already completed today!' };
    }

    await DailyLog.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), habitId: new mongoose.Types.ObjectId(habitId), date: today },
      {
        completed: true,
        completedAt: new Date(),
      },
      { upsert: true }
    );

    await Habit.findByIdAndUpdate(habitId, {
      $inc: { streak: 1 },
      lastCompletedDate: today,
      lastResponseReceived: new Date(),
      $set: { reminderResponseCount: 0 },
    });

    await MessageLog.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        habitId: new mongoose.Types.ObjectId(habitId),
        date: today,
        status: 'sent',
      },
      {
        status: 'responded',
        respondedAt: new Date(),
      }
    );

    const { writeAuditLog } = await import('./audit-log');
    const { AUDIT_ACTIONS } = await import('./audit-log-constants');
    void writeAuditLog({
      userId,
      action: AUDIT_ACTIONS.HABIT_COMPLETED_WHATSAPP,
      category: 'habit_tracking',
      details: `Habit "${habit.name}" completed via WhatsApp response`,
      metadata: { habitId, date: today },
      success: true,
    });

    const encouragementMessages = [
      "Amazing work! You're building great habits! 🌟",
      "Keep it up! Consistency is key! 🔥",
      "Great job! One step at a time! 💪",
      "You're doing fantastic! Keep going! ⭐",
    ];
    
    const user = await User.findById(userId);
    if (user && user.whatsappNumber) {
      const message = `✅ *Habit Completed!*\n\nGreat job completing "${habit.name}" today!\n\n${encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)]}`;
      
      try {
        await pythonApiRequest('/message/send', 'POST', {
          session_id: adminId,
          phone: user.whatsappNumber,
          message: message,
        });
      } catch (e) {
        console.log('[Reminder] Could not send completion confirmation');
      }
    }

    return { success: true, message: 'Habit marked as completed!' };
  } catch (error: any) {
    console.error('[Reminder] Error handling completion response:', error);
    return { success: false, message: error.message };
  }
}

export async function getReminderStatus(habitId: string): Promise<{
  nextReminder: Date | null;
  lastReminder: Date | null;
  responseCount: number;
  logs: any[];
}> {
  try {
    await connectDB();

    const habit = await Habit.findById(habitId);
    const today = new Date().toISOString().split('T')[0];

    const logs = await MessageLog.find({
      habitId: new mongoose.Types.ObjectId(habitId),
      date: today,
      type: { $in: ['poll', 'reminder'] },
    }).sort({ sentAt: -1 }).limit(20).lean();

    return {
      nextReminder: habit?.nextReminderScheduled || null,
      lastReminder: habit?.lastReminderSent || null,
      responseCount: habit?.reminderResponseCount || 0,
      logs: logs.map(l => ({
        id: l._id,
        type: l.type,
        content: l.content,
        status: l.status,
        sentAt: l.sentAt,
        respondedAt: l.respondedAt,
        reminderCount: l.reminderCount,
      })),
    };
  } catch (error) {
    console.error('[Reminder API] Error getting reminder status:', error);
    return {
      nextReminder: null,
      lastReminder: null,
      responseCount: 0,
      logs: [],
    };
  }
}
