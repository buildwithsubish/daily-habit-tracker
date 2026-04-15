import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import WhatsAppPoll from '@/lib/models/WhatsAppPoll';
import DailyLog from '@/lib/models/DailyLog';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import whatsappClientManager from '@/lib/whatsapp-web';

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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, adminId: bodyAdminId = adminId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.whatsappNumber || !user.whatsappVerified) {
      return NextResponse.json({ error: 'User WhatsApp not verified' }, { status: 400 });
    }

    const habits = await Habit.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ order: 1 }).limit(10).lean();

    if (habits.length === 0) {
      return NextResponse.json({ error: 'No habits found for user' }, { status: 400 });
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
      return NextResponse.json({
        error: 'Poll already sent today',
        existingPoll: {
          id: existingPoll._id,
          status: existingPoll.status,
        },
      }, { status: 400 });
    }

    const poll = await WhatsAppPoll.create({
      userId: new mongoose.Types.ObjectId(userId),
      adminId: new mongoose.Types.ObjectId(adminId),
      contactName,
      question,
      options: options.map(text => ({ text, votes: 0, voters: [] })),
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
          adminId,
          userId,
          action: 'poll_created',
          category: 'whatsapp_message',
          details: `Poll sent to ${contactName}`,
          metadata: { question, optionsCount: options.length },
          success: true,
        });

        return NextResponse.json({
          success: true,
          poll: {
            id: poll._id,
            question: poll.question,
            options: poll.options,
            status: poll.status,
            sentAt: poll.sentAt,
          },
        });
      } else {
        poll.status = 'failed';
        await poll.save();
        return NextResponse.json({ error: result.error || 'Failed to create poll' }, { status: 500 });
      }
    } catch (error) {
      poll.status = 'failed';
      await poll.save();
      return NextResponse.json({ error: 'Failed to communicate with WhatsApp server' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Create Poll] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const query: any = {};
    
    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }
    if (date) {
      query.date = date;
    }
    if (status) {
      query.status = status;
    }

    const polls = await WhatsAppPoll.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ polls });
  } catch (error: any) {
    console.error('[Get Polls] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
