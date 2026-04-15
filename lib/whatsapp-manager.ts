import cron, { ScheduledTask } from 'node-cron';
import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import MessageLog from '@/lib/models/MessageLog';
import ReminderLog from '@/lib/models/ReminderLog';
import WhatsAppPoll from '@/lib/models/WhatsAppPoll';
import WeeklyAnalytics from '@/lib/models/WeeklyAnalytics';
import ScheduledJob from '@/lib/models/ScheduledJob';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import { sendWhatsAppMessage } from './whatsapp';

const PYTHON_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8765';

const POLL_QUESTIONS = [
  'What are the completed daily tasks?',
  'Which tasks did you complete today?',
  'Tell us about your completed tasks!',
  'What tasks did you accomplish today?',
  'Share your completed tasks for today!',
  'Did you complete your daily tasks?',
  'Which daily tasks are done?',
];

const REMINDER_MESSAGES = [
  "⏰ *Reminder!* You haven't responded to your task list yet.",
  "📢 *Heads up!* Your daily tasks are waiting for confirmation.",
  "🔔 *Quick check!* Did you complete your tasks today?",
  "⏳ *Don't forget!* Your task list is still pending.",
  "📋 *Hey there!* Your habits poll is waiting for your response.",
  "💪 *Just checking in!* Have you completed your daily tasks?",
  "🎯 *Action time!* Your task poll needs your input.",
  "✨ *Friendly nudge!* Don't leave your habits hanging!",
  "🚀 *One minute!* Complete your tasks and respond to the poll.",
  "🌟 *Your streak matters!* Please confirm your completed tasks.",
  "🔹 *Quick update needed!* Let us know what you accomplished.",
  "📌 *Reminder alert!* Your daily poll is awaiting your reply.",
  "💫 *Stay on track!* Confirm your tasks for today.",
  "⚡ *Time to wrap up!* Share your completed habits.",
  "🎉 *Keep the momentum!* Tell us about your progress.",
];

const POLL_REMINDER_MESSAGES = [
  "📋 *Hey!* Your daily habit poll is waiting for you! Just reply with your completed habits.",
  "⏰ *Quick reminder!* Don't forget to vote on your habit poll. Which tasks did you complete today?",
  "💡 *Heads up!* Your daily poll is still pending. Let us know which habits you finished!",
  "🎯 *Just a nudge!* Your habit completion poll needs your response. What did you accomplish today?",
  "🌟 *Don't break the streak!* Please vote on your daily poll so we can track your progress!",
  "📢 *Reminder!* Your habit tracker wants to know - which tasks did you complete today?",
  "✨ *One last push!* Take a moment to vote on your daily habit poll.",
  "🔔 *Your habits matter!* Please respond to today's poll - what did you get done?",
  "🚀 *Action required!* Your daily habit poll is waiting for your input.",
  "💪 *Keep it going!* Tell us which habits you completed today by voting on the poll!",
];

let schedulerRunning = false;
const schedulerJobs: { [key: string]: ScheduledTask | null } = {};
let healthCheckInterval: NodeJS.Timeout | null = null;

// Auto-restart scheduler if it stops
function startHealthMonitoring() {
  if (healthCheckInterval) return;
  
  healthCheckInterval = setInterval(() => {
    if (!schedulerRunning) {
      console.log('[WhatsApp Health Monitor] Scheduler stopped, auto-restarting...');
      startScheduler();
    }
  }, 30000); // Check every 30 seconds
}

function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// Get the admin session ID from environment - this is the actual session used by the Python server
const getAdminSessionId = (): string => {
  return process.env.ADMIN_ID || '694f9b2feb3b0136ebada5cb';
};

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

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDayOfWeek(date: Date = new Date()): number {
  return date.getDay();
}

function isHabitScheduledForToday(habit: any): boolean {
  const dayOfWeek = getDayOfWeek();
  const { schedule } = habit;
  
  if (schedule?.weekdays && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
  if (schedule?.weekends && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
  if (schedule?.custom && schedule.custom.includes(dayOfWeek)) return true;
  
  return !schedule?.weekdays && !schedule?.weekends && !schedule?.custom;
}

async function ensureContactExists(contactName: string, phoneNumber?: string): Promise<{ success: boolean; existingContactName?: string; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; action?: string; message?: string; error?: string; existing_contact_name?: string; existing_phone_number?: string }>(
      '/contact/open-or-create',
      'POST',
      { session_id: 'default', contact_name: contactName, phone_number: phoneNumber }
    );
    
    // If contact already exists in WhatsApp, extract the existing contact name and update DB
    if (result.action === 'already_exists' && result.existing_contact_name) {
      console.log(`[WhatsApp] Contact already exists: ${result.existing_contact_name}`);
      
      // Update the user's whatsappContactName in the database if phone number is provided
      if (phoneNumber) {
        try {
          await updateUserWhatsAppContactName(phoneNumber, result.existing_contact_name);
          console.log(`[WhatsApp] Updated user contact name for ${phoneNumber}: ${result.existing_contact_name}`);
        } catch (dbError) {
          console.error('[WhatsApp] Failed to update user contact name:', dbError);
        }
      }
      
      return { 
        success: true, 
        existingContactName: result.existing_contact_name 
      };
    }
    
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function to update user's WhatsApp contact name in database
async function updateUserWhatsAppContactName(phoneNumber: string, contactName: string): Promise<void> {
  try {
    // Find user by whatsappNumber and update their contact name
    const result = await User.findOneAndUpdate(
      { whatsappNumber: phoneNumber },
      { 
        whatsappContactName: contactName,
        $setOnInsert: { whatsappNumber: phoneNumber }
      },
      { upsert: false, new: true }
    );
    
    if (result) {
      console.log(`[WhatsApp] Updated whatsappContactName for ${phoneNumber}: ${contactName}`);
    }
  } catch (error) {
    console.error(`[WhatsApp] Error updating contact name for ${phoneNumber}:`, error);
  }
}

// Helper function to get user's WhatsApp contact name
async function getUserWhatsAppContactName(phoneNumber: string): Promise<string | null> {
  try {
    const user = await User.findOne({ whatsappNumber: phoneNumber }).select('whatsappContactName');
    return user?.whatsappContactName || null;
  } catch (error) {
    console.error(`[WhatsApp] Error getting contact name for ${phoneNumber}:`, error);
    return null;
  }
}

// Helper function to get the best contact name (priority: stored WhatsApp contact > username > phone)
async function getBestContactName(phoneNumber: string, username?: string): Promise<string> {
  // First priority: check DB for stored WhatsApp contact name (synced from WhatsApp)
  const storedContactName = await getUserWhatsAppContactName(phoneNumber);
  if (storedContactName && storedContactName.trim()) {
    return storedContactName.trim();
  }
  
  // Second priority: use username if provided
  if (username && username.trim()) {
    return username.trim();
  }
  
  // Third priority: fall back to phone number
  return phoneNumber;
}

async function saveWhatsAppSession(): Promise<{ success: boolean; sessionData?: string; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; session_data?: string; cookie_count?: number; error?: string }>(
      '/session/save',
      'POST',
      { session_id: 'default' }
    );
    return { success: result.success, sessionData: result.session_data, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function setDbSession(sessionData: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; message?: string; error?: string }>(
      '/session/set-db',
      'POST',
      { session_id: 'default', session_data: sessionData }
    );
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function loadWhatsAppSession(sessionData: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; message?: string; error?: string }>(
      '/session/load',
      'POST',
      { session_id: 'default', session_data: sessionData }
    );
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function takeWhatsAppScreenshot(filename?: string): Promise<{ success: boolean; filename?: string; filepath?: string; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; filename?: string; filepath?: string; message?: string; error?: string }>(
      `/screenshot?session_id=default${filename ? `&filename=${filename}` : ''}`,
      'POST'
    );
    return { success: result.success, filename: result.filename, filepath: result.filepath, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function listWhatsAppScreenshots(): Promise<{ screenshots: Array<{ filename: string; filepath: string; size: number; created: string }> }> {
  try {
    const result = await pythonApiRequest<{ screenshots: Array<{ filename: string; filepath: string; size: number; created: string }> }>(
      '/screenshots',
      'GET'
    );
    return result;
  } catch (error: any) {
    return { screenshots: [] };
  }
}

// Export all session management functions

export async function sendDailyHabitMessages(): Promise<{ sent: number; failed: number }> {
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

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const userDoc = user as any;
      
      if (userDoc.whatsappSendTime !== currentTime) continue;

      const habits = await Habit.find({
        userId: new mongoose.Types.ObjectId(userDoc._id),
        whatsappEnabled: true,
      }).lean();

      const todayHabits = habits.filter(isHabitScheduledForToday);
      
      if (todayHabits.length === 0) continue;

      const habitList = todayHabits
        .map((h: any, i: number) => `${i + 1}. ⬜ ${h.name}${h.category ? ` (${h.category})` : ''}`)
        .join('\n');

      const message = `*📝 Your Daily Tasks*\n\n${habitList}\n\n_Reply with the numbers of tasks you've completed! (e.g. "1, 3")_\n\n_Stay consistent!_`;

      const messageLog = await MessageLog.create({
        userId: userDoc._id,
        type: 'summary',
        status: 'sent',
        content: message,
        sentAt: new Date(),
        date: now.toISOString().split('T')[0],
      });

      // Use best contact name: stored WhatsApp contact > username > phone
      const contactName = await getBestContactName(userDoc.whatsappNumber, userDoc.username);
      
      // Ensure contact exists, create if not
      await ensureContactExists(contactName, userDoc.whatsappNumber);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await sendWhatsAppMessage(userDoc.whatsappNumber, message, contactName);

      if (result.ok) {
        await MessageLog.findByIdAndUpdate(messageLog._id, { status: 'sent', messageId: result.messageId });
        sent++;
      } else {
        await MessageLog.findByIdAndUpdate(messageLog._id, { status: 'failed', error: result.error });
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[WhatsApp Automation] Daily messages: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Daily messages error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function processReminders(): Promise<{ sent: number; failed: number }> {
  try {
    await connectDB();

    const today = new Date().toISOString().split('T')[0];
    
    const pendingMessages = await MessageLog.find({
      status: 'sent',
      date: today,
      type: 'summary',
    }).lean();

    let sent = 0;
    let failed = 0;

    for (const message of pendingMessages) {
      const user = await User.findById(message.userId).select('_id username whatsappNumber whatsappReminderCount whatsappContactName');
      if (!user || !user.whatsappNumber) continue;

      const reminderCount = await ReminderLog.countDocuments({
        userId: message.userId,
        messageLogId: message._id,
        status: { $in: ['sent', 'delivered'] },
      });

      const maxReminders = user.whatsappReminderCount || 3;
      if (reminderCount >= maxReminders) continue;

      const lastReminder = await ReminderLog.findOne({
        userId: message.userId,
        messageLogId: message._id,
        status: { $in: ['sent', 'delivered'] },
      }).sort({ createdAt: -1 });

      if (lastReminder) {
        const minutesSince = (Date.now() - lastReminder.createdAt.getTime()) / (1000 * 60);
        if (minutesSince < 10) continue;
      }

      const reminderMessage = `${getRandomItem(REMINDER_MESSAGES)}\n\n${message.content}\n\n_Please reply with the numbers of tasks you've completed._`;

      const reminderLog = await ReminderLog.create({
        userId: message.userId,
        messageLogId: message._id,
        reminderNumber: reminderCount + 1,
        status: 'pending',
        date: today,
      });

      const contactName = await getBestContactName(user.whatsappNumber, user.username);
      const result = await sendWhatsAppMessage(user.whatsappNumber, reminderMessage, contactName);

      if (result.ok) {
        await ReminderLog.findByIdAndUpdate(reminderLog._id, { status: 'sent', sentAt: new Date() });
        sent++;
      } else {
        await ReminderLog.findByIdAndUpdate(reminderLog._id, { status: 'failed', error: result.error });
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[WhatsApp Automation] Reminders: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Reminders error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function createPollForUser(userId: string): Promise<{ success: boolean; pollId?: string; error?: string }> {
  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user || !user.whatsappNumber || !user.whatsappVerified) {
      return { success: false, error: 'User WhatsApp not verified' };
    }

    const habits = await Habit.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ order: 1 }).limit(10).lean();

    if (habits.length === 0) {
      return { success: false, error: 'No habits found' };
    }

    const options = habits.map((h: any) => h.name);
    const question = getRandomItem(POLL_QUESTIONS);
    const contactName = await getBestContactName(user.whatsappNumber, user.username);
    const today = new Date().toISOString().split('T')[0];

    const existingPoll = await WhatsAppPoll.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      status: { $in: ['sent', 'voted', 'completed'] },
    });

    if (existingPoll) {
      return { success: false, error: 'Poll already sent today' };
    }

    const poll = await WhatsAppPoll.create({
      userId: new mongoose.Types.ObjectId(userId),
      contactName,
      question,
      options: options.map((text: string) => ({ text, votes: 0, voters: [] })),
      allowMultiple: true,
      status: 'pending',
      date: today,
    });

    try {
      const result = await pythonApiRequest<{ success: boolean; error?: string }>(
        '/poll/create',
        'POST',
        {
          session_id: 'default',
          contact: contactName,
          question,
          options,
          allow_multiple: true,
        }
      );

      if (result.success) {
        poll.status = 'sent';
        poll.sentAt = new Date();
        await poll.save();
        return { success: true, pollId: poll._id.toString() };
      } else {
        poll.status = 'failed';
        await poll.save();
        return { success: false, error: result.error || 'Failed to create poll' };
      }
    } catch (error: any) {
      poll.status = 'failed';
      await poll.save();
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPollResults(pollId: string): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    await connectDB();

    const poll = await WhatsAppPoll.findById(pollId);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }

    try {
      const result = await pythonApiRequest<{
        success: boolean;
        options?: Array<{ text: string; votes: number }>;
        total_votes?: number;
        error?: string;
      }>('/poll/results', 'POST', {
        session_id: 'default',
        contact: poll.contactName,
        // question is now optional - will use XPath-based parsing
        question: poll.question || undefined,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to get results' };
      }

      poll.options = poll.options.map((opt: any) => {
        const resultOption = result.options?.find((o: any) => o.text === opt.text);
        return { ...opt, votes: resultOption?.votes || 0 };
      });

      poll.totalVotes = result.total_votes || 0;
      poll.status = 'completed';
      poll.completedAt = new Date();

      if (poll.totalVotes > 0) {
        const today = new Date().toISOString().split('T')[0];
        
        for (const option of poll.options) {
          if (option.votes > 0) {
            const habit = await Habit.findOne({ userId: poll.userId, name: option.text });
            if (habit) {
              await DailyLog.findOneAndUpdate(
                { userId: poll.userId, habitId: habit._id, date: today },
                { completed: true, completedAt: new Date() },
                { upsert: true }
              );
              await Habit.findByIdAndUpdate(habit._id, { $inc: { streak: 1 }, lastCompletedDate: today });
            }
          }
        }
      }

      const totalHabits = await Habit.countDocuments({ userId: poll.userId });
      const completedHabits = poll.options.filter((o: any) => o.votes > 0).length;
      
      poll.results = {
        completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
        completedHabits,
        totalHabits,
      };

      await poll.save();

      return { success: true, results: poll };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Parse poll results using XPath-based parsing and update database
 * Uses the unified /poll/results endpoint
 */
export async function parseAndUpdatePollResults(userId: string, contactName: string, pollQuestion?: string): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    await connectDB();

    // Call Python server to parse poll results using XPath
    const result = await pythonApiRequest<{
      success: boolean;
      options?: Array<{ text: string; votes: number }>;
      total_votes?: number;
      question?: string;
      error?: string;
    }>('/poll/results', 'POST', {
      session_id: 'default',
      contact: contactName,
      // question is now optional - will use XPath-based parsing
      question: pollQuestion || undefined,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to parse poll results' };
    }

    const today = new Date().toISOString().split('T')[0];
    const parsedResults = result.options || [];
    
    // Update database with parsed results
    for (const item of parsedResults) {
      // Find the habit by name for this user
      const habit = await Habit.findOne({ 
        userId: new mongoose.Types.ObjectId(userId), 
        name: item.text 
      });
      
      if (habit) {
        const isCompleted = item.votes === 1;
        
        if (isCompleted) {
          // Update DailyLog as completed
          await DailyLog.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId), habitId: habit._id, date: today },
            { completed: true, completedAt: new Date() },
            { upsert: true }
          );
          
          // Increment streak for completed habits
          await Habit.findByIdAndUpdate(habit._id, { 
            $inc: { streak: 1 }, 
            lastCompletedDate: today 
          });
        } else {
          // Mark as not completed (or leave as is if previously completed)
          await DailyLog.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId), habitId: habit._id, date: today },
            { completed: false },
            { upsert: true }
          );
          
          // Reset streak for incomplete habits
          await Habit.findByIdAndUpdate(habit._id, { 
            streak: 0,
            lastCompletedDate: null
          });
        }
      }
    }

    // Calculate totals
    const completedHabits = parsedResults.filter((r: any) => r.votes === 1).length;
    const totalHabits = parsedResults.length;

    // Save poll to database
    const poll = await WhatsAppPoll.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        date: today,
        status: { $in: ['sent', 'voted'] }
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          totalVotes: result.total_votes || completedHabits,
          options: parsedResults.map((r: any) => ({
            text: r.text,
            votes: r.votes,
            voters: []
          })),
          results: {
            completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
            completedHabits,
            totalHabits,
          }
        }
      },
      { upsert: true, new: true }
    );

    return { 
      success: true, 
      results: {
        pollId: poll._id.toString(),
        totalCompleted: completedHabits,
        totalHabits,
        completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
        habits: parsedResults
      }
    };
  } catch (error: any) {
    console.error('[WhatsApp Manager] Parse and update poll results error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPollConfirmation(userId: string, pollId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const poll = await WhatsAppPoll.findById(pollId);
    const user = await User.findById(userId);

    if (!poll || !user || !user.whatsappNumber) {
      return { success: false, error: 'User or poll not found' };
    }

    let message = `✅ *Poll Completed!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (poll.results) {
      message += `📊 *Results:*\n`;
      message += `• Completed: ${poll.results.completedHabits}/${poll.results.totalHabits}\n`;
      message += `• Rate: ${poll.results.completionRate}%\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━\n\n_Thank you for tracking your tasks!_`;

    const contactName = await getBestContactName(user.whatsappNumber, user.username);
    const result = await sendWhatsAppMessage(user.whatsappNumber, message, contactName);
    return { success: result.ok, error: result.ok ? undefined : result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processAllUserPolls(): Promise<{ sent: number; failed: number }> {
  try {
    await connectDB();

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id whatsappSendTime pollSchedule').lean();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const today = now.toISOString().split('T')[0];

    let sent = 0;
    let failed = 0;

    for (const user of users as any[]) {
      const userScheduledTime = user.pollSchedule?.time || user.whatsappSendTime || '20:00';
      const [scheduledHour, scheduledMinute] = userScheduledTime.split(':').map(Number);
      const scheduledTimeMinutes = scheduledHour * 60 + scheduledMinute;

      if (currentTimeMinutes < scheduledTimeMinutes) {
        continue;
      }

      const existingPoll = await WhatsAppPoll.findOne({
        userId: user._id,
        date: today,
        status: { $in: ['sent', 'voted', 'completed'] },
      });

      if (existingPoll) {
        continue;
      }

      const result = await createPollForUser(user._id.toString());
      if (result.success) sent++;
      else failed++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { sent, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Process polls error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function checkPendingPolls(): Promise<{ completed: number; failed: number }> {
  try {
    await connectDB();

    const pendingPolls = await WhatsAppPoll.find({ status: 'sent' }).lean();

    let completed = 0;
    let failed = 0;

    for (const poll of pendingPolls) {
      // Use the unified /poll/results endpoint with XPath-based parsing
      try {
        const parseResult = await pythonApiRequest<{
          success: boolean;
          options?: Array<{ text: string; votes: number }>;
          total_votes?: number;
          error?: string;
        }>('/poll/results', 'POST', {
          session_id: 'default',
          contact: (poll as any).contactName,
          // question is now optional - will use XPath-based parsing
          question: (poll as any).question || undefined,
        });

        if (parseResult.success && parseResult.options) {
          // Update poll in database with parsed results
          const today = new Date().toISOString().split('T')[0];
          
          for (const item of parseResult.options) {
            const isCompleted = item.votes === 1;
            
            // Find habit by name and update
            const habit = await Habit.findOne({ 
              userId: (poll as any).userId, 
              name: item.text 
            });
            
            if (habit) {
              if (isCompleted) {
                await DailyLog.findOneAndUpdate(
                  { userId: (poll as any).userId, habitId: habit._id, date: today },
                  { completed: true, completedAt: new Date() },
                  { upsert: true }
                );
                await Habit.findByIdAndUpdate(habit._id, { 
                  $inc: { streak: 1 }, 
                  lastCompletedDate: today 
                });
              }
            }
          }

          // Calculate totals
          const completedHabits = parseResult.options.filter((o: any) => o.votes === 1).length;
          const totalHabits = parseResult.options.length;

          // Update poll status
          await WhatsAppPoll.findByIdAndUpdate((poll as any)._id, {
            status: 'completed',
            completedAt: new Date(),
            totalVotes: parseResult.total_votes || completedHabits,
            options: parseResult.options.map((r: any) => ({
              text: r.text,
              votes: r.votes,
              voters: []
            })),
            results: {
              completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
              completedHabits,
              totalHabits,
            }
          });

          completed++;
          await sendPollConfirmation((poll as any).userId.toString(), (poll as any)._id.toString());
        } else {
          failed++;
        }
      } catch (parseError: any) {
        console.error(`[Check Pending Polls] Parse error for poll ${(poll as any)._id}:`, parseError);
        
        // Fallback to old method
        const result = await getPollResults((poll as any)._id.toString());
        if (result.success) {
          completed++;
          await sendPollConfirmation((poll as any).userId.toString(), (poll as any)._id.toString());
        } else {
          failed++;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { completed, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Check polls error:', error);
    return { completed: 0, failed: 0 };
  }
}

function getRandomReminderMessage(): string {
  return POLL_REMINDER_MESSAGES[Math.floor(Math.random() * POLL_REMINDER_MESSAGES.length)];
}

export async function processPollReminders(): Promise<{ sent: number; skipped: number }> {
  try {
    await connectDB();

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id whatsappNumber whatsappContactName pollSchedule').lean();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let sent = 0;
    let skipped = 0;

    for (const user of users as any[]) {
      const pollSchedule = user.pollSchedule || {};
      if (!pollSchedule.enabled || !pollSchedule.reminderEnabled) {
        continue;
      }

      const reminderIntervals = pollSchedule.reminderIntervals || [5, 10, 20, 30];
      const scheduledTime = pollSchedule.time || '20:00';
      const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number);
      const scheduledMinutes = scheduledHour * 60 + scheduledMinute;

      const pollsSentToday = await WhatsAppPoll.find({
        userId: user._id,
        date: today,
        status: { $in: ['sent', 'voted', 'completed'] },
      }).sort({ sentAt: -1 }).limit(1).lean();

      if (pollsSentToday.length === 0) {
        continue;
      }

      const latestPoll = pollsSentToday[0] as any;
      if (!latestPoll.sentAt) {
        continue;
      }

      if (latestPoll.status === 'voted' || latestPoll.status === 'completed') {
        continue;
      }

      const pollSentTime = new Date(latestPoll.sentAt);
      const minutesSincePoll = Math.floor((now.getTime() - pollSentTime.getTime()) / 60000);

      for (const interval of reminderIntervals) {
        if (minutesSincePoll < interval) {
          continue;
        }

        const reminderKey = `poll_reminder_${latestPoll._id}_${interval}`;
        const existingReminder = await MessageLog.findOne({
          userId: user._id,
          content: { $regex: new RegExp(`^${reminderKey}`) },
          date: today,
          type: 'poll_reminder',
        });

        if (existingReminder) {
          continue;
        }

        const reminderMessage = getRandomReminderMessage();
        const contactName = user.whatsappContactName || 'User';

        try {
          await pythonApiRequest('/message/send', 'POST', {
            session_id: 'default',
            phone: user.whatsappNumber,
            message: `${reminderKey}|${reminderMessage}`,
          });

          await MessageLog.create({
            userId: user._id,
            type: 'poll_reminder',
            status: 'sent',
            content: `${reminderKey}|${reminderMessage}`,
            sentAt: new Date(),
            date: today,
          });

          sent++;
          console.log(`[Poll Reminder] Sent reminder to ${contactName} at ${interval} minutes`);
        } catch (error) {
          console.error(`[Poll Reminder] Failed to send reminder:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      skipped++;
    }

    return { sent, skipped };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Poll reminders error:', error);
    return { sent: 0, skipped: 0 };
  }
}

export async function generateWeeklyReport(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const user = await User.findById(userId).select('username whatsappNumber whatsappVerified whatsappContactName');
    if (!user || !user.whatsappVerified || !user.whatsappNumber) return { success: false, error: 'User not verified' };

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

    const habits = await Habit.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    const totalHabits = habits.length;
    const completedHabits = dailyLogs.length;
    const completionRate = totalHabits > 0 ? Math.round((completedHabits / (totalHabits * 7)) * 100) : 0;

    const messagesSent = await MessageLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekStartStr, $lte: weekEndStr },
      status: 'sent',
    });

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekLogs = await DailyLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: previousWeekStart.toISOString().split('T')[0], $lt: weekStartStr },
      completed: true,
    });

    const previousRate = totalHabits > 0 ? Math.round((previousWeekLogs / (totalHabits * 7)) * 100) : 0;
    const improvement = completionRate - previousRate;

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
        responseRate: 0,
        previousWeekCompletionRate: previousRate,
        improvementFromLastWeek: improvement,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const message = `📊 *Weekly Report*\n\n━━━━━━━━━━━━━━━━━━━━\n\n✅ *Completed:* ${completedHabits}/${totalHabits * 7}\n📈 *Rate:* ${completionRate}%\n🔥 *Change:* ${improvement >= 0 ? '+' : ''}${improvement}%\n\n━━━━━━━━━━━━━━━━━━━━\n\n_Keep improving!_`;

    const contactName = await getBestContactName(user.whatsappNumber, user.username);
    const result = await sendWhatsAppMessage(user.whatsappNumber, message, contactName);
    return { success: result.ok, error: result.ok ? undefined : result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendWeeklyReports(): Promise<{ sent: number; failed: number }> {
  try {
    await connectDB();

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id').lean();

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const result = await generateWeeklyReport((user as any)._id.toString());
      if (result.success) sent++;
      else failed++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { sent, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Weekly reports error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function sendMorningGreetings(): Promise<{ sent: number; failed: number }> {
  try {
    await connectDB();

const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id username whatsappNumber whatsappContactName').lean();

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const userDoc = user as any;
      const hour = new Date().getHours();
      
      let greeting = '';
      if (hour >= 5 && hour < 12) {
        greeting = '🌅 *Good Morning!*';
      } else if (hour >= 12 && hour < 17) {
        greeting = '☀️ *Good Afternoon!*';
      } else {
        greeting = '🌙 *Good Evening!*';
      }

      const motivationalMessages = [
        "Every small step counts towards your goals!",
        "Today is a new opportunity to build better habits!",
        "Your consistency is your superpower!",
        "Great things happen when you stay consistent!",
        "You're one step closer to your goals today!"
      ];

      const message = `${greeting}\n\n${getRandomItem(motivationalMessages)}\n\n_Ready to conquer your habits today?_ 💪`;

      const contactName = await getBestContactName(userDoc.whatsappNumber, userDoc.username);
      const result = await sendWhatsAppMessage(userDoc.whatsappNumber, message, contactName);

      if (result.ok) {
        sent++;
      } else {
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[WhatsApp Automation] Morning greetings: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Morning greetings error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function sendInactivityAlert(userId: string, daysInactive: number): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const user = await User.findById(userId).select('whatsappNumber whatsappVerified');
    if (!user || !user.whatsappNumber || !user.whatsappVerified) {
      return { success: false, error: 'User not verified' };
    }

    const message = `😔 *We miss you!*\n\nYou haven't used the app for ${daysInactive} days.\n\nYour habits are waiting! Come back and track your progress.\n\n_Start today!_`;

    const contactName = await getBestContactName(user.whatsappNumber, user.username);
    const result = await sendWhatsAppMessage(user.whatsappNumber, message, contactName);
    return { success: result.ok, error: result.ok ? undefined : result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkInactivity(): Promise<{ alertsSent: number }> {
  try {
    await connectDB();

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const inactiveUsers = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      $or: [
        { lastActive: { $lt: threeDaysAgo } },
        { lastActive: { $exists: false } },
      ],
    }).select('_id').lean();

    let alertsSent = 0;
    for (const user of inactiveUsers) {
      const result = await sendInactivityAlert((user as any)._id.toString(), 3);
      if (result.success) alertsSent++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { alertsSent };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Inactivity check error:', error);
    return { alertsSent: 0 };
  }
}

export function startScheduler(): void {
  if (schedulerRunning) {
    console.log('⚠️ WhatsApp Scheduler already running');
    return;
  }

  try {
    schedulerJobs.dailyMessages = cron.schedule('0 * * * *', async () => {
      console.log('[WhatsApp Scheduler] Running daily messages...');
      await sendDailyHabitMessages();
    });

    schedulerJobs.reminders = cron.schedule('*/15 * * * *', async () => {
      console.log('[WhatsApp Scheduler] Processing reminders...');
      await processReminders();
    });

    schedulerJobs.polls = cron.schedule('*/5 * * * *', async () => {
      console.log('[WhatsApp Scheduler] Checking for scheduled polls...');
      await processAllUserPolls();
    });

    schedulerJobs.pollReminders = cron.schedule('*/5 * * * *', async () => {
      console.log('[WhatsApp Scheduler] Processing poll reminders...');
      await processPollReminders();
    });

    schedulerJobs.pollResults = cron.schedule('0 20 * * *', async () => {
      console.log('[WhatsApp Scheduler] Checking poll results...');
      await checkPendingPolls();
    });

    schedulerJobs.weeklyReports = cron.schedule('0 9 * * 0', async () => {
      console.log('[WhatsApp Scheduler] Sending weekly reports...');
      await sendWeeklyReports();
    });

    schedulerJobs.inactivity = cron.schedule('0 18 * * *', async () => {
      console.log('[WhatsApp Scheduler] Checking inactivity...');
      await checkInactivity();
    });

    // Add greeting messages at 6 AM
    schedulerJobs.greetings = cron.schedule('0 6 * * *', async () => {
      console.log('[WhatsApp Scheduler] Sending morning greetings...');
      await sendMorningGreetings();
    });

    schedulerRunning = true;
    startHealthMonitoring(); // Start health monitoring
    console.log('✅ WhatsApp Automation Scheduler started');
    console.log('   📝 Daily Messages: Every hour at :00');
    console.log('   🔔 Reminders: Every 15 minutes');
    console.log('   📊 Polls: Every 5 minutes (sends at user\'s scheduled time)');
    console.log('   🔄 Poll Reminders: Every 5 minutes (sends if user hasn\'t voted)');
    console.log('   📈 Poll Results: Daily at 8 PM');
    console.log('   📅 Weekly Reports: Sundays at 9 AM');
    console.log('   ⚠️  Inactivity Alerts: Daily at 6 PM');
    console.log('   🌅 Morning Greetings: Daily at 6 AM');
  } catch (error) {
    console.error('❌ Failed to start scheduler:', error);
  }
}

export function stopScheduler(): void {
  for (const [key, job] of Object.entries(schedulerJobs)) {
    if (job) {
      job.stop();
      console.log(`   Stopped: ${key}`);
    }
  }
  stopHealthMonitoring(); // Stop health monitoring
  schedulerRunning = false;
  console.log('✅ WhatsApp Automation Scheduler stopped');
}

export function getSchedulerStatus(): { running: boolean; jobs: string[]; nextRun?: { [key: string]: string } } {
  if (!schedulerRunning) {
    return { running: false, jobs: [], nextRun: {} };
  }

  // Calculate next run times for each job
  const now = new Date();
  const nextRunTimes: { [key: string]: string } = {};

  // Job schedules:
  // dailyMessages: '0 * * * *' - Every hour at :00
  // reminders: '*/15 * * * *' - Every 15 minutes
  // polls: '0 8 * * *' - Daily at 8 AM
  // pollResults: '0 20 * * *' - Daily at 8 PM
  // weeklyReports: '0 9 * * 0' - Sundays at 9 AM
  // inactivity: '0 18 * * *' - Daily at 6 PM
  // greetings: '0 6 * * *' - Daily at 6 AM

  // Calculate next run for dailyMessages (every hour at :00)
  const dailyMessagesNext = new Date(now);
  dailyMessagesNext.setMinutes(0, 0, 0);
  dailyMessagesNext.setHours(dailyMessagesNext.getHours() + 1);
  nextRunTimes.dailyMessages = dailyMessagesNext.toISOString();

  // Calculate next run for reminders (every 15 minutes)
  const remindersNext = new Date(now);
  const reminderMinutes = Math.ceil(remindersNext.getMinutes() / 15) * 15;
  remindersNext.setMinutes(reminderMinutes, 0, 0);
  if (remindersNext <= now) {
    remindersNext.setHours(remindersNext.getHours() + 1);
  }
  nextRunTimes.reminders = remindersNext.toISOString();

  // Calculate next run for polls (daily at 8 AM)
  const pollsNext = new Date(now);
  pollsNext.setHours(8, 0, 0, 0);
  if (pollsNext <= now) {
    pollsNext.setDate(pollsNext.getDate() + 1);
  }
  nextRunTimes.polls = pollsNext.toISOString();

  // Calculate next run for pollResults (daily at 8 PM)
  const pollResultsNext = new Date(now);
  pollResultsNext.setHours(20, 0, 0, 0);
  if (pollResultsNext <= now) {
    pollResultsNext.setDate(pollResultsNext.getDate() + 1);
  }
  nextRunTimes.pollResults = pollResultsNext.toISOString();

  // Calculate next run for weeklyReports (Sundays at 9 AM)
  const weeklyReportsNext = new Date(now);
  weeklyReportsNext.setHours(9, 0, 0, 0);
  const daysUntilSunday = (7 - weeklyReportsNext.getDay()) % 7;
  if (daysUntilSunday === 0 && weeklyReportsNext <= now) {
    weeklyReportsNext.setDate(weeklyReportsNext.getDate() + 7);
  } else {
    weeklyReportsNext.setDate(weeklyReportsNext.getDate() + daysUntilSunday);
  }
  nextRunTimes.weeklyReports = weeklyReportsNext.toISOString();

  // Calculate next run for inactivity (daily at 6 PM)
  const inactivityNext = new Date(now);
  inactivityNext.setHours(18, 0, 0, 0);
  if (inactivityNext <= now) {
    inactivityNext.setDate(inactivityNext.getDate() + 1);
  }
  nextRunTimes.inactivity = inactivityNext.toISOString();

  // Calculate next run for greetings (daily at 6 AM)
  const greetingsNext = new Date(now);
  greetingsNext.setHours(6, 0, 0, 0);
  if (greetingsNext <= now) {
    greetingsNext.setDate(greetingsNext.getDate() + 1);
  }
  nextRunTimes.greetings = greetingsNext.toISOString();

  return {
    running: schedulerRunning,
    jobs: Object.keys(schedulerJobs).filter(key => schedulerJobs[key] !== null),
    nextRun: nextRunTimes,
  };
}

export default {
  sendDailyHabitMessages,
  processReminders,
  createPollForUser,
  getPollResults,
  parseAndUpdatePollResults,
  sendPollConfirmation,
  processAllUserPolls,
  checkPendingPolls,
  generateWeeklyReport,
  sendWeeklyReports,
  sendInactivityAlert,
  checkInactivity,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  saveWhatsAppSession,
  loadWhatsAppSession,
  setDbSession,
  takeWhatsAppScreenshot,
  listWhatsAppScreenshots,
};
