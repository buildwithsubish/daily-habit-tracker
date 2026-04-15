import * as cron from 'node-cron';
import connectDB from './mongodb';
import User from './models/User';
import Habit from './models/Habit';
import MessageLog from './models/MessageLog';
import DailyLog from './models/DailyLog';
import AuditLog from './models/AuditLog';
import { sendWhatsAppMessage, formatHabitListMessage } from './whatsapp';
import mongoose from 'mongoose';

const PYTHON_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8765';

interface ScheduledTask {
  habitId: string;
  userId: string;
  job: cron.ScheduledTask;
}

const activeReminders: Map<string, ScheduledTask> = new Map();
let schedulerInitialized = false;
let cleanupJob: cron.ScheduledTask | null = null;

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
  const url = `${PYTHON_SERVER_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
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

    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action: 'habit_completed_via_whatsapp',
      category: 'habit_completion',
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

async function processReminderCycle(habit: any, user: any): Promise<void> {
  const habitId = habit._id.toString();
  const userId = habit.userId.toString();
  const today = new Date().toISOString().split('T')[0];

  const todayLog = await DailyLog.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    habitId: new mongoose.Types.ObjectId(habitId),
    date: today,
    completed: true,
  });

  if (todayLog) {
    console.log(`[Reminder] Habit "${habit.name}" already completed today, skipping reminders`);
    return;
  }

  await sendHabitPoll(habitId, userId, habit.name);

  const maxReminders = habit.maxReminders || 3;
  const interval = habit.reminderInterval || 5;

  for (let i = 0; i < maxReminders; i++) {
    const delayMs = (i + 1) * interval * 60 * 1000;
    
    setTimeout(async () => {
      const checkLog = await DailyLog.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        habitId: new mongoose.Types.ObjectId(habitId),
        date: today,
        completed: true,
      });

      if (checkLog) {
        console.log(`[Reminder] Habit "${habit.name}" completed, stopping reminder cycle`);
        return;
      }

      await sendHabitReminder(habitId, userId, i);
    }, delayMs);
  }
}

export async function scheduleHabitReminder(habitId: string): Promise<void> {
  try {
    await connectDB();

    const habit = await Habit.findById(habitId);
    if (!habit || !habit.reminderEnabled) {
      console.log(`[Scheduler] Habit ${habitId} not eligible for scheduling`);
      return;
    }

    const user = await User.findById(habit.userId);
    if (!user || !user.whatsappNumber || !user.whatsappVerified || !user.whatsappAutomation) {
      console.log(`[Scheduler] User for habit ${habitId} not eligible for WhatsApp`);
      return;
    }

    const key = `${habit.userId}_${habitId}`;
    if (activeReminders.has(key)) {
      const existing = activeReminders.get(key);
      if (existing) {
        existing.job.stop();
      }
      activeReminders.delete(key);
    }

    const [hours, minutes] = (habit.reminderTime || '08:00').split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;

    if (!cron.validate(cronExpression)) {
      console.error(`[Scheduler] Invalid cron expression for habit ${habitId}: ${cronExpression}`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      await processReminderCycle(habit, user);
    }, {
      timezone: user.timeZone || 'UTC',
    });

    activeReminders.set(key, {
      habitId,
      userId: habit.userId.toString(),
      job,
    });

    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun <= new Date()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    await Habit.findByIdAndUpdate(habitId, {
      nextReminderScheduled: nextRun,
    });

    console.log(`[Scheduler] Scheduled reminder for habit "${habit.name}" at ${habit.reminderTime}`);
  } catch (error) {
    console.error(`[Scheduler] Error scheduling habit ${habitId}:`, error);
  }
}

export async function unscheduleHabitReminder(habitId: string): Promise<void> {
  for (const [key, value] of activeReminders.entries()) {
    if (value.habitId === habitId) {
      value.job.stop();
      activeReminders.delete(key);
      console.log(`[Scheduler] Unscheduled reminder for habit ${habitId}`);
      break;
    }
  }

  try {
    await connectDB();
    await Habit.findByIdAndUpdate(habitId, {
      nextReminderScheduled: null,
    });
  } catch (error) {
    console.error('[Scheduler] Error clearing scheduled time:', error);
  }
}

export async function initializeAllReminders(): Promise<void> {
  try {
    await connectDB();

    const habits = await Habit.find({
      reminderEnabled: true,
      active: true,
    }).lean();

    console.log(`[Scheduler] Initializing ${habits.length} habit reminders`);

    for (const habit of habits as any[]) {
      const user = await User.findById(habit.userId);
      if (user && user.whatsappNumber && user.whatsappVerified && user.whatsappAutomation) {
        await scheduleHabitReminder(habit._id.toString());
      }
    }

    cleanupJob = cron.schedule('0 0 * * *', async () => {
      console.log('[Scheduler] Running daily cleanup...');
      await cleanupOldMessageLogs();
    });

    schedulerInitialized = true;
    console.log('✅ Habit Reminder Scheduler initialized');
  } catch (error) {
    console.error('[Scheduler] Failed to initialize reminders:', error);
  }
}

async function cleanupOldMessageLogs(): Promise<void> {
  try {
    await connectDB();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await MessageLog.deleteMany({
      date: { $lt: thirtyDaysAgo.toISOString().split('T')[0] },
      status: { $in: ['sent', 'delivered', 'responded'] },
    });

    console.log(`[Scheduler] Cleaned up ${result.deletedCount} old message logs`);
  } catch (error) {
    console.error('[Scheduler] Error cleaning up logs:', error);
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
    console.error('[Scheduler] Error getting reminder status:', error);
    return {
      nextReminder: null,
      lastReminder: null,
      responseCount: 0,
      logs: [],
    };
  }
}

export function stopAllReminders(): void {
  for (const [, value] of activeReminders.entries()) {
    value.job.stop();
  }
  activeReminders.clear();
  
  if (cleanupJob) {
    cleanupJob.stop();
  }
  
  schedulerInitialized = false;
  console.log('🛑 All reminder schedulers stopped');
}
