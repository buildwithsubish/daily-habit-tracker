import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import { requireAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);

    const user = await User.findById(userId).select(
      'whatsappAutomation whatsappNumber whatsappVerified whatsappSendTime whatsappFrequency pollSchedule weeklyReportSchedule'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSession = await WhatsAppSession.findOne({ status: 'connected' });

    return NextResponse.json({
      settings: {
        enabled: user.whatsappAutomation || false,
        dailyReminder: true,
        weeklySummary: true,
        pollCreation: true,
        streakAlerts: true,
        reminderTime: user.whatsappSendTime || '20:00',
        summaryDay: 0,
        pollSchedule: user.pollSchedule || { enabled: true, time: '20:00', frequency: 'daily', customDays: [] },
        weeklyReportSchedule: user.weeklyReportSchedule || { enabled: true, day: 0, time: '09:00' },
      },
      status: activeSession ? 'connected' : 'disconnected',
      phoneNumber: user.whatsappNumber,
      isVerified: user.whatsappVerified || false,
    });
  } catch (error: any) {
    console.error('[WhatsApp Automation Settings] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const body = await request.json();

    const { enabled, dailyReminder, weeklySummary, pollCreation, streakAlerts, reminderTime, summaryDay } = body;

    const updateFields: any = {};

    if (typeof enabled === 'boolean') {
      const user = await User.findById(userId);
      if (enabled && user && !user.whatsappVerified) {
        return NextResponse.json(
          { error: 'Please verify your WhatsApp number first' },
          { status: 400 }
        );
      }
      updateFields.whatsappAutomation = enabled;
    }

    if (typeof dailyReminder === 'boolean') {
      updateFields.whatsappDailyReminder = dailyReminder;
    }

    if (typeof weeklySummary === 'boolean') {
      updateFields.whatsappWeeklySummary = weeklySummary;
    }

    if (typeof pollCreation === 'boolean') {
      updateFields.whatsappPollCreation = pollCreation;
    }

    if (typeof streakAlerts === 'boolean') {
      updateFields.whatsappStreakAlerts = streakAlerts;
    }

    if (reminderTime) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(reminderTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM (24-hour format)' },
          { status: 400 }
        );
      }
      updateFields.whatsappSendTime = reminderTime;
    }

    if (typeof summaryDay === 'number') {
      updateFields.whatsappSummaryDay = summaryDay;
    }

    await User.findByIdAndUpdate(userId, updateFields);

    return NextResponse.json({
      success: true,
      message: 'Automation settings updated',
      settings: updateFields,
    });
  } catch (error: any) {
    console.error('[WhatsApp Automation Settings] POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
