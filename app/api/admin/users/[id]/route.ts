import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAdmin } from '@/lib/admin-middleware';
import { resolveUserPhone } from '@/lib/pii';
import { maskPhoneNumber } from '@/lib/security';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    requireAdmin(request);

    const { id: userId } = await params;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get user details
    const user = await User.findById(userIdObj)
      .select('email username createdAt timeZone notificationPreferences whatsappNumber whatsappNumberEncrypted whatsappAutomation whatsappVerified pollSchedule weeklyReportSchedule')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    type UserLean = {
      _id: mongoose.Types.ObjectId;
      email: string;
      username?: string;

      createdAt: Date;
      timeZone: string;
      notificationPreferences: any;
      whatsappNumber?: string;
      whatsappAutomation?: boolean;
      whatsappVerified?: boolean;
      pollSchedule?: {
        enabled: boolean;
        time: string;
        frequency: string;
        customDays: number[];
      };
      weeklyReportSchedule?: {
        enabled: boolean;
        day: number;
        time: string;
      };
    };
    const typedUser = user as unknown as UserLean;

    // Get user habits
    const habits = await Habit.find({ userId: userIdObj })
      .select('name category type steps order createdAt hidden')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    type HabitLean = { _id: mongoose.Types.ObjectId; name: string; category: string; type: string; steps: any[]; order: number; createdAt: Date; hidden: boolean };
    const typedHabits = habits as unknown as HabitLean[];

    // Get daily logs with completion stats
    const logs = await DailyLog.find({ userId: userIdObj })
      .sort({ date: -1 })
      .limit(100)
      .lean();

    type LogLean = { _id: mongoose.Types.ObjectId; habitId: mongoose.Types.ObjectId; date: string; completed: boolean; stepIndex: number | null; completedAt: Date | null };
    const typedLogs = logs as unknown as LogLean[];

    // Calculate statistics
    const totalLogs = await DailyLog.countDocuments({ userId: userIdObj });
    const completedLogs = await DailyLog.countDocuments({ userId: userIdObj, completed: true });
    const completionRate = totalLogs > 0 ? (completedLogs / totalLogs) * 100 : 0;

    // Get streaks
    const habitStreaks: Record<string, { current: number; longest: number }> = {};

    for (const habit of typedHabits) {
      const habitLogs = await DailyLog.find({ userId: userIdObj, habitId: habit._id })
        .sort({ date: -1 })
        .lean();

      type StreakLogLean = { date: string; completed: boolean };
      const typedHabitLogs = habitLogs as unknown as StreakLogLean[];

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date().toISOString().split('T')[0];

      for (let i = 0; i < typedHabitLogs.length; i++) {
        const log = typedHabitLogs[i];
        if (log.completed) {
          if (i === 0 && log.date === today) {
            currentStreak = 1;
            tempStreak = 1;
          } else if (i > 0) {
            const prevDate = new Date(typedHabitLogs[i - 1].date);
            const currDate = new Date(log.date);
            const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              tempStreak++;
              if (i === 0) currentStreak = tempStreak;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      habitStreaks[habit._id.toString()] = {
        current: currentStreak,
        longest: longestStreak,
      };
    }

    // Get activity by date
    const activityByDate = await DailyLog.aggregate<{ _id: string; total: number; completed: number }>([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: '$date',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    const phone = resolveUserPhone(typedUser as any);
    return NextResponse.json({
      user: {
        id: typedUser._id.toString(),
        email: typedUser.email,
        username: typedUser.username || 'N/A',
        createdAt: typedUser.createdAt,
        timeZone: typedUser.timeZone,
        whatsappNumber: phone ? maskPhoneNumber(phone) : null,
        whatsappAutomation: typedUser.whatsappAutomation,
        whatsappVerified: typedUser.whatsappVerified,
        pollSchedule: typedUser.pollSchedule || { enabled: true, time: '20:00', frequency: 'daily', customDays: [] },
        weeklyReportSchedule: typedUser.weeklyReportSchedule || { enabled: true, day: 0, time: '09:00' },
        notificationPreferences: typedUser.notificationPreferences,
      },
      habits: typedHabits.map(h => ({
        id: h._id.toString(),
        name: h.name,
        category: h.category,
        type: h.type,
        steps: h.steps,
        order: h.order,
        hidden: h.hidden,
        createdAt: h.createdAt,
        streak: habitStreaks[h._id.toString()] || { current: 0, longest: 0 },
      })),
      logs: typedLogs.map(l => ({
        id: l._id.toString(),
        habitId: l.habitId.toString(),
        date: l.date,
        completed: l.completed,
        stepIndex: l.stepIndex,
        completedAt: l.completedAt,
      })),
      statistics: {
        totalHabits: typedHabits.length,
        totalLogs,
        completedLogs,
        completionRate: completionRate.toFixed(1),
        activityByDate: activityByDate.map(a => ({
          date: a._id,
          total: a.total,
          completed: a.completed,
        })),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    requireAdmin(request);

    const { id: userId } = await params;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const body = await request.json();
    const { preferredTheme, whatsappAction, scheduleSettings } = body;

    // Handle schedule settings update
    if (scheduleSettings) {
      const updateFields: any = {};
      
      if (scheduleSettings.pollSchedule) {
        const { enabled, time, frequency, customDays } = scheduleSettings.pollSchedule;
        if (typeof enabled === 'boolean') {
          updateFields['pollSchedule.enabled'] = enabled;
        }
        if (time) {
          updateFields['pollSchedule.time'] = time;
        }
        if (frequency) {
          updateFields['pollSchedule.frequency'] = frequency;
        }
        if (customDays && Array.isArray(customDays)) {
          updateFields['pollSchedule.customDays'] = customDays;
        }
      }
      
      if (scheduleSettings.weeklyReportSchedule) {
        const { enabled, day, time } = scheduleSettings.weeklyReportSchedule;
        if (typeof enabled === 'boolean') {
          updateFields['weeklyReportSchedule.enabled'] = enabled;
        }
        if (day !== undefined) {
          updateFields['weeklyReportSchedule.day'] = day;
        }
        if (time) {
          updateFields['weeklyReportSchedule.time'] = time;
        }
      }
      
      const user = await User.findByIdAndUpdate(
        userIdObj,
        updateFields,
        { new: true }
      );

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Schedule settings updated successfully',
        pollSchedule: user.pollSchedule,
        weeklyReportSchedule: user.weeklyReportSchedule,
      });
    }

    // Handle WhatsApp-related actions
    if (whatsappAction) {
      if (whatsappAction === 'remove_phone') {
        const user = await User.findByIdAndUpdate(
          userIdObj,
          {
            whatsappNumber: '',
            whatsappNumberEncrypted: '',
            whatsappNumberHash: '',
            whatsappVerified: false,
            whatsappAutomation: false,
          },
          { new: true }
        );

        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'WhatsApp number removed successfully',
        });
      }

      if (whatsappAction === 'toggle_automation') {
        const { enable } = body;
        const user = await User.findByIdAndUpdate(
          userIdObj,
          { whatsappAutomation: enable },
          { new: true }
        );

        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: `WhatsApp automation ${enable ? 'enabled' : 'disabled'} successfully`,
          whatsappAutomation: user.whatsappAutomation,
        });
      }

      if (whatsappAction === 'reset_verification') {
        const user = await User.findByIdAndUpdate(
          userIdObj,
          {
            whatsappVerified: false,
            whatsappVerificationCode: '',
            whatsappAutomation: false,
          },
          { new: true }
        );

        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'WhatsApp verification reset successfully',
        });
      }

      return NextResponse.json({ error: 'Invalid WhatsApp action' }, { status: 400 });
    }

    // Handle theme update
    if (!preferredTheme) {
      return NextResponse.json(
        { error: 'preferredTheme is required' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userIdObj,
      { preferredTheme },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Theme "${preferredTheme}" assigned to user`,
      user: {
        id: user._id.toString(),
        email: user.email,
        preferredTheme: user.preferredTheme,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
