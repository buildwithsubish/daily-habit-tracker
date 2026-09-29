import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import WhatsAppVerification from '@/lib/models/WhatsAppVerification';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import {
  buildSharedContactStorage,
  maskSharedContactsForApi,
  resolveUserPhone,
} from '@/lib/pii';
import { maskPhoneNumber } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { requireAuth } = await import('@/lib/middleware');
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    if (userId === 'me') {
      userId = requireAuth(request);
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(userId).select(
      'whatsappNumber whatsappNumberEncrypted whatsappVerified whatsappAutomation whatsappSendTime whatsappFrequency whatsappReminderCount pollSchedule weeklyReportSchedule sharedContacts'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const phone = resolveUserPhone(user);

    return NextResponse.json({
      whatsappNumber: phone ? maskPhoneNumber(phone) : null,
      whatsappVerified: user.whatsappVerified,
      whatsappAutomation: user.whatsappAutomation,
      whatsappSendTime: user.whatsappSendTime,
      whatsappFrequency: user.whatsappFrequency,
      whatsappReminderCount: user.whatsappReminderCount,
      pollSchedule: user.pollSchedule || {
        enabled: true,
        time: '20:00',
        frequency: 'daily',
        customDays: [],
        reminderEnabled: true,
        reminderIntervals: [5, 10, 20, 30],
      },
      weeklyReportSchedule: user.weeklyReportSchedule || { enabled: true, day: 0, time: '09:00' },
      sharedContacts: maskSharedContactsForApi(user.sharedContacts || []),
    });
  } catch (error: any) {
    console.error('[WhatsApp Settings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const { requireAuth } = await import('@/lib/middleware');
    const body = await request.json();
    let { userId, settings } = body;

    if (userId === 'me') {
      userId = requireAuth(request);
    }

    if (!userId || !settings) {
      return NextResponse.json({ error: 'User ID and settings are required' }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = {};

    if (typeof settings.whatsappAutomation === 'boolean') {
      if (settings.whatsappAutomation && !user.whatsappVerified) {
        return NextResponse.json({ error: 'Please verify your WhatsApp number first' }, { status: 400 });
      }
      updateFields.whatsappAutomation = settings.whatsappAutomation;
    }

    if (typeof settings.disableAutomation === 'boolean' && settings.disableAutomation) {
      updateFields.whatsappAutomation = false;
    }

    if (settings.whatsappSendTime) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(settings.whatsappSendTime)) {
        return NextResponse.json({ error: 'Invalid time format. Use HH:MM (24-hour format)' }, { status: 400 });
      }
      updateFields.whatsappSendTime = settings.whatsappSendTime;
    }

    if (settings.whatsappFrequency) {
      const validFrequencies = ['daily', 'weekly'];
      if (!validFrequencies.includes(settings.whatsappFrequency)) {
        return NextResponse.json({ error: 'Invalid frequency. Use "daily" or "weekly"' }, { status: 400 });
      }
      updateFields.whatsappFrequency = settings.whatsappFrequency;
    }

    if (settings.whatsappReminderCount !== undefined) {
      const reminderCount = parseInt(settings.whatsappReminderCount, 10);
      if (isNaN(reminderCount) || reminderCount < 0 || reminderCount > 5) {
        return NextResponse.json({ error: 'Reminder count must be between 0 and 5' }, { status: 400 });
      }
      updateFields.whatsappReminderCount = reminderCount;
    }

    if (settings.pollSchedule) {
      const { enabled, time, frequency, customDays, reminderEnabled, reminderIntervals } = settings.pollSchedule;
      if (typeof enabled === 'boolean') updateFields['pollSchedule.enabled'] = enabled;
      if (time) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(time)) {
          return NextResponse.json({ error: 'Invalid poll time format. Use HH:MM (24-hour format)' }, { status: 400 });
        }
        updateFields['pollSchedule.time'] = time;
      }
      if (frequency) {
        const validFrequencies = ['daily', 'weekdays', 'weekends', 'custom'];
        if (!validFrequencies.includes(frequency)) {
          return NextResponse.json({ error: 'Invalid poll frequency' }, { status: 400 });
        }
        updateFields['pollSchedule.frequency'] = frequency;
      }
      if (customDays && Array.isArray(customDays)) {
        if (!customDays.every((d: number) => d >= 0 && d <= 6)) {
          return NextResponse.json({ error: 'Invalid custom days. Days must be 0-6' }, { status: 400 });
        }
        updateFields['pollSchedule.customDays'] = customDays;
      }
      if (typeof reminderEnabled === 'boolean') updateFields['pollSchedule.reminderEnabled'] = reminderEnabled;
      if (reminderIntervals && Array.isArray(reminderIntervals)) {
        if (!reminderIntervals.every((i: number) => typeof i === 'number' && i > 0 && i <= 120)) {
          return NextResponse.json({ error: 'Invalid reminder intervals' }, { status: 400 });
        }
        updateFields['pollSchedule.reminderIntervals'] = reminderIntervals;
      }
    }

    if (settings.weeklyReportSchedule) {
      const { enabled, day, time } = settings.weeklyReportSchedule;
      if (typeof enabled === 'boolean') updateFields['weeklyReportSchedule.enabled'] = enabled;
      if (day !== undefined) {
        if (day < 0 || day > 6) {
          return NextResponse.json({ error: 'Invalid day. Day must be 0-6' }, { status: 400 });
        }
        updateFields['weeklyReportSchedule.day'] = day;
      }
      if (time) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(time)) {
          return NextResponse.json({ error: 'Invalid report time format. Use HH:MM (24-hour format)' }, { status: 400 });
        }
        updateFields['weeklyReportSchedule.time'] = time;
      }
    }

    if (settings.sharedContacts && Array.isArray(settings.sharedContacts)) {
      const existing = user.sharedContacts || [];
      updateFields.sharedContacts = settings.sharedContacts
        .filter((c: { name?: string }) => c && typeof c.name === 'string' && c.name.trim())
        .map((c: { name: string; phone?: string; relation?: string; enabledForReports?: boolean }, idx: number) =>
          buildSharedContactStorage(c, existing[idx])
        );
    }

    await User.findByIdAndUpdate(userId, updateFields);

    await AuditLog.create({
      userId,
      action: 'whatsapp_settings_updated',
      category: 'whatsapp_verification',
      details: 'WhatsApp settings updated',
      success: true,
    });

    return NextResponse.json({ success: true, message: 'WhatsApp settings updated' });
  } catch (error: any) {
    console.error('[WhatsApp Settings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { requireAuth } = await import('@/lib/middleware');
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    if (userId === 'me') {
      userId = requireAuth(request);
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await User.findByIdAndUpdate(userId, {
      whatsappNumber: '',
      whatsappNumberEncrypted: '',
      whatsappNumberHash: '',
      whatsappVerified: false,
      whatsappAutomation: false,
      sharedContacts: [],
    });

    await WhatsAppVerification.deleteMany({ userId });

    await AuditLog.create({
      userId,
      action: 'whatsapp_unlinked',
      category: 'whatsapp_verification',
      details: 'WhatsApp number unlinked from account',
      success: true,
    });

    return NextResponse.json({ success: true, message: 'WhatsApp number unlinked' });
  } catch (error: any) {
    console.error('[WhatsApp Settings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}