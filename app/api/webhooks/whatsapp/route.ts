import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import MessageLog from '@/lib/models/MessageLog';
import ReminderLog from '@/lib/models/ReminderLog';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import { hashPhoneNumber } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { from, message, messageId, timestamp } = body;

    if (!from || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const phoneNumber = from.replace('whatsapp:', '').replace('@c.us', '');
    const phoneHash = hashPhoneNumber(phoneNumber);

    const user = await User.findOne({
      whatsappNumberHash: phoneHash,
      whatsappVerified: true,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id;
    const messageText = message.toLowerCase().trim();
    const today = new Date().toISOString().split('T')[0];

    await MessageLog.findOneAndUpdate(
      { userId, date: today, status: 'sent' },
      { 
        status: 'responded',
        respondedAt: new Date(),
      },
      { sort: { sentAt: -1 } }
    );

    const habits = await Habit.find({
      userId,
      whatsappEnabled: true,
    }).sort({ order: 1 }).lean();

    const completedHabitIds: string[] = [];

    if (messageText === 'completed' || messageText === 'yes' || messageText === 'done') {
      const incompleteHabits = habits.slice(0, 3);
      for (const habit of incompleteHabits) {
        if (habit._id) {
          await DailyLog.findOneAndUpdate(
            {
              userId,
              habitId: habit._id,
              date: today,
            },
            {
              completed: true,
              completedAt: new Date(),
            },
            { upsert: true }
          );
          completedHabitIds.push(habit._id.toString());
        }
      }
    } else {
    const numbers = messageText
      .split(/[,+\s]+/)
      .map((n: string) => parseInt(n.trim()))
      .filter((n: number) => !isNaN(n) && n > 0 && n <= habits.length);

    for (const num of numbers) {
      const habit = habits[num - 1];
      if (habit && habit._id) {
        await DailyLog.findOneAndUpdate(
          {
            userId,
            habitId: habit._id,
            date: today,
          },
          {
            completed: true,
            completedAt: new Date(),
          },
          { upsert: true }
        );
        completedHabitIds.push(habit._id.toString());
      }
    }
    }

    if (completedHabitIds.length > 0) {
      await Habit.updateMany(
        { _id: { $in: completedHabitIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
        { 
          streak: { $inc: 1 },
          lastCompletedDate: today,
        }
      );
    }

    await ReminderLog.updateMany(
      { userId, date: today, status: { $in: ['sent', 'delivered'] } },
      { 
        responseReceived: true,
        responseContent: messageText,
        responseParsed: { completedHabits: completedHabitIds },
      }
    );

    const totalCompletedToday = await DailyLog.countDocuments({
      userId,
      date: today,
      completed: true,
    });

    const totalHabitsToday = habits.length;

    let responseMessage = '';
    if (completedHabitIds.length > 0) {
      responseMessage = `🎉 Great job! You've completed ${completedHabitIds.length} habit${completedHabitIds.length > 1 ? 's' : ''} today!\n\n`;
      responseMessage += `Total: ${totalCompletedToday}/${totalHabitsToday}\n\n`;
      responseMessage += `_Keep up the momentum!_`;
    } else {
      responseMessage = `I didn't understand your response. Please reply with the numbers of the habits you've completed (e.g., "1, 3, 5") or "done" to mark all as complete.`;
    }

    await AuditLog.create({
      userId,
      action: 'whatsapp_response_processed',
      category: 'whatsapp_message',
      details: `Processed response: "${messageText}" - Completed: ${completedHabitIds.length}`,
      metadata: { 
        messageText, 
        completedHabitIds,
        totalCompletedToday,
        totalHabitsToday,
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      response: responseMessage,
      completedHabits: completedHabitIds.length,
    });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
