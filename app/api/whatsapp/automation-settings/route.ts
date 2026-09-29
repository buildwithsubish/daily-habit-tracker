import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import { requireAuth } from '@/lib/middleware';
import { buildSharedContactStorage, maskSharedContactsForApi } from '@/lib/pii';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);

    const user = await User.findById(userId).select(
      'whatsappAutomation whatsappNumber whatsappVerified whatsappSendTime whatsappFrequency pollSchedule weeklyReportSchedule sharedContacts whatsappReminderCount'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSession = await WhatsAppSession.findOne({ status: 'connected' });
    const pollSchedule = user.pollSchedule || { enabled: true, time: '20:00', frequency: 'daily', customDays: [] };
    const weeklyReportSchedule = user.weeklyReportSchedule || { enabled: true, day: 0, time: '09:00' };

    return NextResponse.json({
      settings: {
        enabled: user.whatsappAutomation || false,
        dailyReminder: (user.whatsappReminderCount ?? 0) > 0,
        weeklySummary: weeklyReportSchedule.enabled !== false,
        pollCreation: pollSchedule.enabled !== false,
        streakAlerts: pollSchedule.reminderEnabled !== false,
        reminderTime: user.whatsappSendTime || '20:00',
        summaryDay: weeklyReportSchedule.day ?? 0,
        pollSchedule,
        weeklyReportSchedule,
        sharedContacts: maskSharedContactsForApi(user.sharedContacts || []),
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

    const updateFields: Record<string, unknown> = {};

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

    const user = await User.findById(userId).select('pollSchedule weeklyReportSchedule whatsappReminderCount');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (typeof dailyReminder === 'boolean') {
      updateFields.whatsappReminderCount = dailyReminder ? Math.max(user.whatsappReminderCount || 3, 1) : 0;
    }

    if (typeof weeklySummary === 'boolean' || typeof summaryDay === 'number') {
      updateFields.weeklyReportSchedule = {
        ...(user.weeklyReportSchedule || { enabled: true, day: 0, time: '09:00' }),
        ...(typeof weeklySummary === 'boolean' ? { enabled: weeklySummary } : {}),
        ...(typeof summaryDay === 'number' && summaryDay >= 0 && summaryDay <= 6 ? { day: summaryDay } : {}),
      };
    }

    if (typeof pollCreation === 'boolean' || typeof streakAlerts === 'boolean') {
      const poll = user.pollSchedule || { enabled: true, time: '20:00', frequency: 'daily', customDays: [], reminderEnabled: true, reminderIntervals: [5, 10, 20, 30] };
      updateFields.pollSchedule = {
        ...poll,
        ...(typeof pollCreation === 'boolean' ? { enabled: pollCreation } : {}),
        ...(typeof streakAlerts === 'boolean' ? { reminderEnabled: streakAlerts } : {}),
      };
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

    if (body.sharedContacts && Array.isArray(body.sharedContacts)) {
      const existing = user.sharedContacts || [];
      updateFields.sharedContacts = body.sharedContacts
        .filter((c: { name?: string }) => c && c.name)
        .map((c: { name: string; phone?: string; relation?: string; enabledForReports?: boolean }, idx: number) =>
          buildSharedContactStorage(c, existing[idx])
        );
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