import cron from 'node-cron';
import connectDB from './mongodb';
import User from './models/User';
import Habit from './models/Habit';
import DailyLog from './models/DailyLog';
import MessageLog from './models/MessageLog';
import ReminderLog from './models/ReminderLog';
import WeeklyAnalytics from './models/WeeklyAnalytics';
import ScheduledJob from './models/ScheduledJob';
import AuditLog from './models/AuditLog';
import { sendWhatsAppMessage, formatHabitListMessage, formatDashboardSummary, getAppreciativeMessage } from './whatsapp';
import whatsappClientManager from './whatsapp-web';
import mongoose from 'mongoose';

const CRON_SECRET = process.env.CRON_SECRET || '';
let schedulerInitialized = false;

function getDayOfWeek(date: Date = new Date()): number {
  return date.getDay();
}

function isHabitScheduledForToday(habit: any): boolean {
  const dayOfWeek = getDayOfWeek();
  const { schedule } = habit;
  
  if (schedule.weekdays && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
  if (schedule.weekends && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
  if (schedule.custom && schedule.custom.includes(dayOfWeek)) return true;
  
  return false;
}

async function getUserHabitsForToday(userId: string): Promise<any[]> {
  const habits = await Habit.find({
    userId: new mongoose.Types.ObjectId(userId),
    whatsappEnabled: true,
    $or: [
      { whatsappFrequency: 'daily' },
      { 
        whatsappFrequency: 'weekly',
        createdAt: { $lte: new Date() }
      },
    ],
  }).lean();

  return habits.filter(isHabitScheduledForToday);
}

async function sendDailyHabitMessages() {
  try {
    await connectDB();

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id username whatsappNumber whatsappSendTime whatsappContactName').lean();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    console.log(`[Scheduler] Checking for users to send messages at ${currentTime}...`);

    let sentCount = 0;
    let eligibleUsers = 0;

    for (const user of users) {
      const userDoc = user as any;
      
      // Skip if user's scheduled time doesn't match current time
      if (userDoc.whatsappSendTime !== currentTime) continue;

      console.log(`[Scheduler] User ${userDoc.username} is scheduled for ${userDoc.whatsappSendTime}`);

      const habits = await getUserHabitsForToday(userDoc._id.toString());
      
      if (habits.length === 0) {
        console.log(`[Scheduler] No WhatsApp-enabled habits for user ${userDoc.username}`);
        continue;
      }

      eligibleUsers++;
      console.log(`[Scheduler] Sending message to ${userDoc.username} with ${habits.length} habits`);

      const message = formatHabitListMessage(
        habits.map((h: any) => ({ 
          name: h.name, 
          category: h.category,
          id: h._id.toString()
        }))
      );

      const messageLog = await MessageLog.create({
        userId: userDoc._id,
        type: 'summary',
        status: 'pending',
        content: message,
        sentAt: new Date(),
        date: now.toISOString().split('T')[0],
      });

      const result = await sendWhatsAppMessage(userDoc.whatsappNumber, message, userDoc.whatsappContactName || userDoc.username);

      if (result.ok) {
        await MessageLog.findByIdAndUpdate(messageLog._id, {
          status: 'sent',
          messageId: result.messageId,
        });
        sentCount++;
        console.log(`[Scheduler] Successfully sent to ${userDoc.whatsappNumber}`);
      } else {
        await MessageLog.findByIdAndUpdate(messageLog._id, {
          status: 'failed',
          error: result.error,
        });
        console.error(`[Scheduler] Failed to send to ${userDoc.whatsappNumber}: ${result.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`[Scheduler] Daily habit messages: ${sentCount} sent, ${eligibleUsers} eligible users`);
    return { sent: sentCount, eligible: eligibleUsers };
  } catch (error) {
    console.error('[Scheduler] Daily habit messages error:', error);
    return { sent: 0, eligible: 0 };
  }
}

async function processReminders() {
  try {
    await connectDB();

    const today = new Date().toISOString().split('T')[0];
    
    const pendingMessages = await MessageLog.find({
      status: 'sent',
      date: today,
      type: 'summary',
    }).lean();

    let remindersSent = 0;

    for (const message of pendingMessages) {
      const user = await User.findById(message.userId).select('_id whatsappNumber whatsappReminderCount whatsappContactName username');
      if (!user || !user.whatsappNumber) continue;

      const reminderCount = await ReminderLog.countDocuments({
        userId: message.userId,
        messageLogId: message._id,
        status: { $in: ['sent', 'delivered'] },
      });

      if (reminderCount >= (user.whatsappReminderCount || 3)) continue;

      const lastReminder = await ReminderLog.findOne({
        userId: message.userId,
        messageLogId: message._id,
        status: { $in: ['sent', 'delivered'] },
      }).sort({ createdAt: -1 });

      if (lastReminder) {
        const minutesSinceLastReminder = (Date.now() - lastReminder.createdAt.getTime()) / (1000 * 60);
        if (minutesSinceLastReminder < 10) continue;
      }

      const reminderMessage = `⏰ *Reminder!*\n\nYou haven't responded to your habit list yet.\n\n${message.content}\n\n_Please reply with the numbers of habits you've completed._`;

      const reminderLog = await ReminderLog.create({
        userId: message.userId,
        messageLogId: message._id,
        reminderNumber: reminderCount + 1,
        status: 'pending',
        date: today,
      });

      const contactName = user.whatsappContactName || user.username;
      const result = await sendWhatsAppMessage(user.whatsappNumber, reminderMessage, contactName);

      if (result.ok) {
        await ReminderLog.findByIdAndUpdate(reminderLog._id, {
          status: 'sent',
          sentAt: new Date(),
        });
        remindersSent++;
      } else {
        await ReminderLog.findByIdAndUpdate(reminderLog._id, {
          status: 'failed',
          error: result.error,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`[Scheduler] Reminders sent: ${remindersSent}`);
    return { remindersSent };
  } catch (error) {
    console.error('[Scheduler] Reminders error:', error);
    return { remindersSent: 0 };
  }
}

async function generateWeeklyReport(userId: string, adminId: string, format: 'text' | 'image' = 'text') {
  try {
    await connectDB();

    const user = await User.findById(userId).select('username whatsappNumber whatsappVerified whatsappContactName');
    if (!user || !user.whatsappVerified || !user.whatsappNumber) return null;

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const dailyLogs = await DailyLog.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekStartStr, $lte: weekEndStr },
      completed: true,
    }).lean();

    const habits = await Habit.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    const totalHabits = habits.length;
    const completedHabits = dailyLogs.length;
    const completionRate = totalHabits > 0 ? Math.round((completedHabits / (totalHabits * 7)) * 100) : 0;

    const messagesSent = await MessageLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekStartStr, $lte: weekEndStr },
      status: 'sent',
    });

    const messagesResponded = await MessageLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekStartStr, $lte: weekEndStr },
      respondedAt: { $exists: true },
    });

    const responseRate = messagesSent > 0 ? Math.round((messagesResponded / messagesSent) * 100) : 0;

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);

    const previousWeekLogs = await DailyLog.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { 
        $gte: previousWeekStart.toISOString().split('T')[0], 
        $lte: previousWeekEnd.toISOString().split('T')[0] 
      },
      completed: true,
    }).lean();

    const previousCompletionRate = totalHabits > 0 
      ? Math.round((previousWeekLogs.length / (totalHabits * 7)) * 100) 
      : 0;

    const improvement = completionRate - previousCompletionRate;

    await WeeklyAnalytics.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), weekStartDate: weekStartStr },
      {
        userId: new mongoose.Types.ObjectId(userId),
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        totalHabits,
        completedHabits,
        completionRate,
        totalMessagesSent: messagesSent,
        messagesResponded,
        responseRate,
        previousWeekCompletionRate: previousCompletionRate,
        improvementFromLastWeek: improvement,
        reportFormat: format,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    let reportMessage = `📊 *Weekly Habit Report*\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `✅ *Total Habits Completed:* ${completedHabits}\n`;
    reportMessage += `📈 *Completion Rate:* ${completionRate}%\n`;
    reportMessage += `💬 *Response Rate:* ${responseRate}%\n`;
    reportMessage += `🔥 *Improvement:* ${improvement >= 0 ? '+' : ''}${improvement}%\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `_Keep up the great work! ${getAppreciativeMessage()}_`;

    const contactName = user.whatsappContactName || user.username;
    const result = await sendWhatsAppMessage(user.whatsappNumber, reportMessage, contactName);

    if (result.ok) {
      await WeeklyAnalytics.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId), weekStartDate: weekStartStr },
        { reportSentAt: new Date() }
      );

      await AuditLog.create({
        adminId,
        userId,
        action: 'weekly_report_sent',
        category: 'whatsapp_message',
        details: `Weekly report sent to user`,
        success: true,
      });

      return { success: true, messageId: result.messageId };
    }

    return { success: false, error: result.error };
  } catch (error: any) {
    console.error(`[Scheduler] Weekly report error for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

async function sendWeeklyReports() {
  try {
    await connectDB();

    const adminId = process.env.ADMIN_ID || 'default';

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id').lean();

    let reportsSent = 0;

    for (const user of users) {
      const result = await generateWeeklyReport((user as any)._id.toString(), adminId, 'text');
      if (result?.success) reportsSent++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`[Scheduler] Weekly reports sent to ${reportsSent} users`);
    return { reportsSent };
  } catch (error) {
    console.error('[Scheduler] Weekly reports error:', error);
    return { reportsSent: 0 };
  }
}

async function processScheduledJobs() {
  try {
    await connectDB();

    const now = new Date();
    
    const pendingJobs = await ScheduledJob.find({
      status: 'pending',
      scheduledFor: { $lte: now },
    }).lean();

    for (const job of pendingJobs) {
      await ScheduledJob.findByIdAndUpdate(job._id, {
        status: 'running',
        startedAt: now,
      });

      try {
        if (job.jobType === 'custom_broadcast') {
          const users = await User.find({
            _id: { $in: job.targetUsers },
            whatsappVerified: true,
            whatsappNumber: { $exists: true, $ne: '' },
          }).select('whatsappNumber');

          let sent = 0;
          let failed = 0;

          for (const user of users) {
            const result = await whatsappClientManager.sendMessage(
              job.adminId?.toString() || '',
              (user as any).whatsappNumber,
              job.messageTemplate || ''
            );
            if (result.success) sent++;
            else failed++;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          await ScheduledJob.findByIdAndUpdate(job._id, {
            status: 'completed',
            completedAt: new Date(),
            result: { totalUsers: users.length, messagesSent: sent, messagesFailed: failed },
          });
        }
      } catch (error: any) {
        await ScheduledJob.findByIdAndUpdate(job._id, {
          status: 'failed',
          completedAt: new Date(),
          result: { errors: error.message },
        });
      }
    }
  } catch (error) {
    console.error('[Scheduler] Process scheduled jobs error:', error);
  }
}

export function initializeWhatsAppScheduler() {
  if (schedulerInitialized) {
    console.log('⚠️ WhatsApp Scheduler already initialized');
    return;
  }

  try {
    cron.schedule('0 * * * *', async () => {
      await sendDailyHabitMessages();
    });

    cron.schedule('*/10 * * * *', async () => {
      await processReminders();
    });

    cron.schedule('0 9 * * 0', async () => {
      await sendWeeklyReports();
    });

    cron.schedule('*/5 * * * *', async () => {
      await processScheduledJobs();
    });

    schedulerInitialized = true;
    console.log('✅ WhatsApp Scheduler initialized');
    console.log('   📤 Daily Habit Messages: Every hour');
    console.log('   ⏰ Reminders: Every 10 minutes');
    console.log('   📊 Weekly Reports: Every Sunday at 9 AM');
    console.log('   🔄 Scheduled Jobs: Every 5 minutes');

    return {
      stop: () => {
        schedulerInitialized = false;
        console.log('WhatsApp Scheduler stopped');
      },
    };
  } catch (error) {
    console.error('Failed to initialize WhatsApp Scheduler:', error);
  }
}

export async function triggerDailyMessages() {
  return await sendDailyHabitMessages();
}

export async function triggerReminders() {
  return await processReminders();
}

export async function triggerWeeklyReports() {
  return await sendWeeklyReports();
}

export { generateWeeklyReport };
