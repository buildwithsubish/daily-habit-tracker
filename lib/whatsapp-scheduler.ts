import cron from 'node-cron';
import connectDB from './mongodb';
import User from './models/User';
import Habit from './models/Habit';
import MessageLog from './models/MessageLog';
import { sendWhatsAppMessage, formatHabitListMessage } from './whatsapp';
import mongoose from 'mongoose';

const CRON_SECRET = process.env.CRON_SECRET || '';
let schedulerInitialized = false;

/**
 * Send scheduled messages for a specific user
 */
async function sendScheduledMessages(userId: string) {
  try {
    const user = await User.findById(userId).select('whatsappNumber whatsappVerified whatsappAutomation pollSchedule whatsappContactName username');
    
    if (!user || !user.whatsappNumber || !user.whatsappVerified || !user.whatsappAutomation) {
      return false;
    }

    // Check if polls are enabled for this user and scheduled for today
    const pollSchedule = user.pollSchedule || { enabled: true, time: '08:00', frequency: 'daily', customDays: [] };
    if (!pollSchedule.enabled) {
      return false;
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [scheduledHour, scheduledMinute] = pollSchedule.time.split(':').map(Number);

    // Check if it's time to send (within 5 minute window)
    const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (scheduledHour * 60 + scheduledMinute));
    if (timeDiff > 5) {
      return false;
    }

    // Check if today is a scheduled day based on frequency
    let shouldSendToday = false;
    switch (pollSchedule.frequency) {
      case 'daily':
        shouldSendToday = true;
        break;
      case 'weekdays':
        shouldSendToday = dayOfWeek >= 1 && dayOfWeek <= 5;
        break;
      case 'weekends':
        shouldSendToday = dayOfWeek === 0 || dayOfWeek === 6;
        break;
      case 'custom':
        shouldSendToday = pollSchedule.customDays.includes(dayOfWeek);
        break;
    }

    if (!shouldSendToday) {
      return false;
    }

    // Find habits with whatsApp enabled and due for today
    const habits = await Habit.find({
      userId: new mongoose.Types.ObjectId(userId),
      whatsappEnabled: true,
      'whatsappFrequency': { $in: ['daily', 'weekly'] }
    }).lean();

    if (habits.length === 0) {
      return false;
    }

    const message = formatHabitListMessage(
      habits.map(h => ({ name: h.name, category: h.category }))
    );

    // Log the scheduled message
    const messageLog = await MessageLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'summary',
      status: 'scheduled',
      content: message,
      scheduledFor: new Date(),
      date: new Date().toISOString().split('T')[0],
    });

    // Send the message
    const contactName = user.whatsappContactName || user.username;
    const result = await sendWhatsAppMessage(user.whatsappNumber, message, contactName);

    if (result.ok) {
      await MessageLog.findByIdAndUpdate(messageLog._id, {
        status: 'sent',
        sentAt: new Date(),
        messageId: result.messageId,
      });
      console.log(`[Scheduler] Message sent to ${user.whatsappNumber}`);
      return true;
    } else {
      await MessageLog.findByIdAndUpdate(messageLog._id, {
        status: 'failed',
        error: result.error,
      });
      console.error(`[Scheduler] Message failed for ${user.whatsappNumber}: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('[Scheduler] Error sending scheduled message:', error);
    return false;
  }
}

/**
 * Send reminders to active users
 */
async function sendReminders() {
  try {
    await connectDB();

    // Find users with WhatsApp enabled
    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' }
    }).select('_id').lean();

    if (users.length === 0) {
      return { remindersSent: 0 };
    }

    let remindersSent = 0;
    for (const user of users) {
      const sent = await sendScheduledMessages((user as any)._id.toString());
      if (sent) remindersSent++;
    }

    return { remindersSent };
  } catch (error) {
    console.error('[Scheduler] Reminders job error:', error);
    return { remindersSent: 0 };
  }
}

/**
 * Send daily summaries / weekly reports
 */
async function sendDailySummaries() {
  try {
    await connectDB();

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find users with daily frequency enabled
    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' }
    }).select('_id weeklyReportSchedule').lean();

    if (users.length === 0) {
      return { sent: 0 };
    }

    let sent = 0;
    for (const user of users) {
      const weeklySchedule = (user as any).weeklyReportSchedule || { enabled: true, day: 0, time: '09:00' };
      
      // Check if weekly reports are enabled for this user
      if (!weeklySchedule.enabled) {
        continue;
      }

      // Check if today is the scheduled day
      if (weeklySchedule.day !== dayOfWeek) {
        continue;
      }

      // Check if it's time to send (within 5 minute window)
      const [scheduledHour, scheduledMinute] = weeklySchedule.time.split(':').map(Number);
      const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (scheduledHour * 60 + scheduledMinute));
      if (timeDiff > 5) {
        continue;
      }

      const result = await sendScheduledMessages((user as any)._id.toString());
      if (result) sent++;
    }

    return { sent };
  } catch (error) {
    console.error('[Scheduler] Daily summary job error:', error);
    return { sent: 0 };
  }
}

/**
 * Retry failed messages
 */
async function retryFailedMessages() {
  try {
    await connectDB();

    // Find failed messages that haven't exceeded retry limit
    const failedMessages = await MessageLog.find({
      status: 'failed',
      retryCount: { $lt: '$maxRetries' },
      date: new Date().toISOString().split('T')[0] // Only retry today's messages
    }).lean();

    let retriedCount = 0;
    for (const message of failedMessages) {
      const user = await User.findById(message.userId).select('whatsappNumber');
      
      if (!user || !user.whatsappNumber) continue;

      const result = await sendWhatsAppMessage(user.whatsappNumber, message.content);

      if (result.ok) {
        await MessageLog.findByIdAndUpdate(message._id, {
          status: 'sent',
          sentAt: new Date(),
          messageId: result.messageId,
          $inc: { retryCount: 1 }
        });
        retriedCount++;
      } else {
        await MessageLog.findByIdAndUpdate(message._id, {
          $inc: { retryCount: 1 },
          error: result.error
        });
      }
    }

    return { retriedCount };
  } catch (error) {
    console.error('[Scheduler] Retry job error:', error);
    return { retriedCount: 0 };
  }
}

export function initializeWhatsAppScheduler(force: boolean = false) {
  // Allow initialization without CRON_SECRET in development mode
  const isDev = process.env.NODE_ENV === 'development';
  if (schedulerInitialized && !force) {
    console.log('⚠️ WhatsApp Scheduler already initialized');
    return;
  }

  if (!CRON_SECRET && !isDev) {
    console.warn('⚠️ CRON_SECRET not configured. WhatsApp scheduling is disabled.');
    console.log('💡 Set CRON_SECRET environment variable or run in development mode');
    return;
  }

  if (!CRON_SECRET && isDev) {
    console.log('⚠️ CRON_SECRET not set, running in development mode (limited functionality)');
  }

  try {
    // Daily summary at 8 AM
    const dailySummaryJob = cron.schedule('0 8 * * *', async () => {
      try {
        console.log('[WhatsApp Scheduler] Running daily summary job...');
        await connectDB();
        const data = await sendDailySummaries();
        console.log(`[WhatsApp Scheduler] Daily summary sent to ${data.sent} users`);
      } catch (error) {
        console.error('[WhatsApp Scheduler] Daily summary error:', error);
      }
    });

    // Reminders at 10 AM, 2 PM, 7 PM
    const remindersJob = cron.schedule('0 10,14,19 * * *', async () => {
      try {
        console.log('[WhatsApp Scheduler] Running reminders job...');
        await connectDB();
        const data = await sendReminders();
        console.log(`[WhatsApp Scheduler] Reminders sent: ${data.remindersSent}`);
      } catch (error) {
        console.error('[WhatsApp Scheduler] Reminders error:', error);
      }
    });

    // Retry failed messages every 15 minutes
    const retryJob = cron.schedule('*/15 * * * *', async () => {
      try {
        await connectDB();
        const data = await retryFailedMessages();
        if (data.retriedCount > 0) {
          console.log(`[WhatsApp Scheduler] Retried ${data.retriedCount} failed messages`);
        }
      } catch (error) {
        console.error('[WhatsApp Scheduler] Retry job error:', error);
      }
    });

    schedulerInitialized = true;
    console.log('✅ WhatsApp Scheduler initialized');
    console.log('   📤 Daily Summary: Every day at 08:00');
    console.log('   📤 Reminders: Every day at 10:00, 14:00, 19:00');
    console.log('   🔄 Retry Failed: Every 15 minutes');

    return {
      dailySummaryJob,
      remindersJob,
      retryJob,
      stop: () => {
        dailySummaryJob.stop();
        remindersJob.stop();
        retryJob.stop();
        schedulerInitialized = false;
        console.log('WhatsApp Scheduler stopped');
      },
    };
  } catch (error) {
    console.error('Failed to initialize WhatsApp Scheduler:', error);
  }
}

