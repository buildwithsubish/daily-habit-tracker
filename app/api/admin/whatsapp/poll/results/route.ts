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
    const { pollId, autoUpdateHabits = true } = body;

    if (!pollId) {
      return NextResponse.json({ error: 'Poll ID required' }, { status: 400 });
    }

    const poll = await WhatsAppPoll.findById(pollId);
    
    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
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
        question: poll.question,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to get results' }, { status: 500 });
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
        adminId: adminId,
        userId: poll.userId,
        action: 'poll_results_received',
        category: 'whatsapp_message',
        details: `Poll results received: ${poll.totalVotes} votes`,
        metadata: { pollId: poll._id, results: poll.results },
        success: true,
      });

      return NextResponse.json({
        success: true,
        poll: {
          id: poll._id,
          question: poll.question,
          options: poll.options,
          totalVotes: poll.totalVotes,
          status: poll.status,
          results: poll.results,
          completedAt: poll.completedAt,
        },
      });
    } catch (error) {
      console.error('[Poll Results] Error:', error);
      return NextResponse.json({ error: 'Failed to get poll results' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Poll Results API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
