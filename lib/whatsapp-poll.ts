import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import WhatsAppPoll from '@/lib/models/WhatsAppPoll';
import DailyLog from '@/lib/models/DailyLog';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';

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

function getRandomQuestion(): string {
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

export async function createPollForUser(
  userId: string,
  adminId: string = 'default'
): Promise<{ success: boolean; pollId?: string; error?: string }> {
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
      return { success: false, error: 'No habits found for user' };
    }

    const options = habits.map((h: any) => h.name);
    const question = getRandomQuestion();
    const contactName = user.whatsappContactName || user.username || user.whatsappNumber;
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
      adminId: new mongoose.Types.ObjectId(adminId),
      contactName,
      question,
      options: options.map((text: string) => ({ text, votes: 0, voters: [] })),
      allowMultiple: true,
      status: 'pending',
      date: today,
    });

    try {
      const result = await pythonApiRequest<{ success: boolean; message?: string; error?: string }>(
        '/poll/create',
        'POST',
        {
          session_id: adminId,
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

        await AuditLog.create({
          adminId: new mongoose.Types.ObjectId(adminId),
          userId: new mongoose.Types.ObjectId(userId),
          action: 'poll_created_automated',
          category: 'whatsapp_message',
          details: `Automated poll sent to ${contactName}`,
          metadata: { question, optionsCount: options.length },
          success: true,
        });

        return { success: true, pollId: poll._id.toString() };
      } else {
        poll.status = 'failed';
        await poll.save();
        return { success: false, error: result.error || 'Failed to create poll' };
      }
    } catch (error: any) {
      poll.status = 'failed';
      await poll.save();
      return { success: false, error: 'Failed to communicate with WhatsApp server' };
    }
  } catch (error: any) {
    console.error('[Poll Automation] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getPollResults(
  pollId: string,
  adminId: string = 'default',
  autoUpdateHabits: boolean = true
): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    await connectDB();

    const poll = await WhatsAppPoll.findById(pollId);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }

    try {
      const result = await pythonApiRequest<{
        success: boolean;
        question?: string;
        options?: Array<{ text: string; votes: number }>;
        total_votes?: number;
        error?: string;
      }>('/poll/results', 'POST', {
        session_id: adminId,
        contact: poll.contactName,
        // question is now optional - will use XPath-based parsing
        question: poll.question || undefined,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to get results' };
      }

      poll.options = poll.options.map((opt: any) => {
        const resultOption = result.options?.find((o: any) => o.text === opt.text);
        return {
          ...opt,
          votes: resultOption?.votes || 0,
        };
      });

      poll.totalVotes = result.total_votes || 0;
      poll.status = 'completed';
      poll.completedAt = new Date();

      if (autoUpdateHabits && poll.totalVotes > 0) {
        const today = new Date().toISOString().split('T')[0];
        
        for (const option of poll.options) {
          if (option.votes > 0) {
            const habit = await Habit.findOne({
              userId: poll.userId,
              name: option.text,
            });

            if (habit) {
              await DailyLog.findOneAndUpdate(
                { userId: poll.userId, habitId: habit._id, date: today },
                {
                  completed: true,
                  completedAt: new Date(),
                },
                { upsert: true }
              );

              await Habit.findByIdAndUpdate(habit._id, {
                $inc: { streak: 1 },
                lastCompletedDate: today,
              });
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

      await AuditLog.create({
        adminId: new mongoose.Types.ObjectId(adminId),
        userId: poll.userId,
        action: 'poll_results_automated',
        category: 'whatsapp_message',
        details: `Automated poll results: ${poll.totalVotes} votes`,
        metadata: { pollId: poll._id, results: poll.results },
        success: true,
      });

      return {
        success: true,
        results: {
          id: poll._id,
          question: poll.question,
          options: poll.options,
          totalVotes: poll.totalVotes,
          results: poll.results,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    console.error('[Poll Results Automation] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPollConfirmation(
  userId: string,
  pollId: string,
  adminId: string = 'default'
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const poll = await WhatsAppPoll.findById(pollId);
    const user = await User.findById(userId);

    if (!poll || !user || !user.whatsappNumber) {
      return { success: false, error: 'User or poll not found' };
    }

    let message = `✅ *Poll Completed!*\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (poll.results) {
      message += `📊 *Results:*\n`;
      message += `• Completed: ${poll.results.completedHabits}/${poll.results.totalHabits}\n`;
      message += `• Rate: ${poll.results.completionRate}%\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `_Thank you for tracking your habits!_`;

    try {
      await pythonApiRequest('/message/send', 'POST', {
        session_id: adminId,
        phone: user.whatsappNumber,
        message: message,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Failed to send confirmation' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processAllUserPolls(
  adminId: string = 'default'
): Promise<{ sent: number; failed: number }> {
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
      const result = await createPollForUser((user as any)._id.toString(), adminId);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { sent, failed };
  } catch (error: any) {
    console.error('[Process All Polls] Error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function checkAndCompletePolls(
  adminId: string = 'default'
): Promise<{ completed: number; failed: number }> {
  try {
    await connectDB();

    const pendingPolls = await WhatsAppPoll.find({
      status: 'sent',
    }).lean();

    let completed = 0;
    let failed = 0;

    for (const poll of pendingPolls) {
      const result = await getPollResults((poll as any)._id.toString(), adminId, true);
      
      if (result.success) {
        completed++;
        
        await sendPollConfirmation(
          (poll as any).userId.toString(),
          (poll as any)._id.toString(),
          adminId
        );
      } else {
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { completed, failed };
  } catch (error: any) {
    console.error('[Check Polls] Error:', error);
    return { completed: 0, failed: 0 };
  }
}
