import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAdmin } from '@/lib/admin-middleware';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_ACTIONS } from '@/lib/audit-log-constants';
import { resolveUserPhone } from '@/lib/pii';
import { maskPhoneNumber } from '@/lib/security';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // all, active, inactive
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const query: any = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [users, total, activeCount, inactiveCount] = await Promise.all([
      User.find(query)
        .select('email username createdAt timeZone whatsappNumber whatsappNumberEncrypted whatsappAutomation whatsappVerified pollSchedule weeklyReportSchedule isActive lastLogin')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
    ]);

    type UserLean = { 
      _id: mongoose.Types.ObjectId; 
      email: string; 
      username?: string; 
      createdAt: Date; 
      timeZone: string; 
      whatsappNumber?: string; 
      whatsappAutomation?: boolean;
      whatsappVerified?: boolean;
      isActive: boolean;
      lastLogin?: Date;
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
    const typedUsers = users as unknown as UserLean[];

    const usersWithStats = await Promise.all(
      typedUsers.map(async (user) => {
        const userId = new mongoose.Types.ObjectId(user._id);

        const [habitCount, logCount, completedLogs] = await Promise.all([
          Habit.countDocuments({ userId }),
          DailyLog.countDocuments({ userId }),
          DailyLog.countDocuments({ userId, completed: true }),
        ]);

        const lastActivity = await DailyLog.findOne({ userId })
          .sort({ date: -1 })
          .select('date')
          .lean() as unknown as { date?: string } | null;

        const phone = resolveUserPhone(user as any);
        return {
          id: user._id.toString(),
          email: user.email,
          username: user.username || 'N/A',
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isActive: user.isActive,
          timeZone: user.timeZone,
          whatsappNumber: phone ? maskPhoneNumber(phone) : null,
          whatsappAutomation: user.whatsappAutomation,
          whatsappVerified: user.whatsappVerified,
          pollSchedule: user.pollSchedule || { enabled: true, time: '08:00', frequency: 'daily', customDays: [] },
          weeklyReportSchedule: user.weeklyReportSchedule || { enabled: true, day: 0, time: '09:00' },
          stats: {
            habitCount,
            logCount,
            completedLogs,
            completionRate: logCount > 0 ? ((completedLogs / logCount) * 100).toFixed(1) : '0',
            lastActivity: lastActivity?.date || null,
          },
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        all: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const admin = requireAdmin(request);

    const body = await request.json();
    const { userIds, action } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs required' }, { status: 400 });
    }

    let updateData: any = {};
    let actionDescription = '';

    if (action === 'activate') {
      updateData = { isActive: true };
      actionDescription = 'activated';
    } else if (action === 'deactivate') {
      updateData = { isActive: false };
      actionDescription = 'deactivated';
    } else if (action === 'delete') {
      // Delete users and all their data
      for (const userId of userIds) {
        const objectId = new mongoose.Types.ObjectId(userId);
        await Promise.all([
          Habit.deleteMany({ userId: objectId }),
          DailyLog.deleteMany({ userId: objectId }),
          User.deleteOne({ _id: objectId }),
        ]);
      }
      
      void writeAuditLogFromRequest(request, {
        adminId: admin.adminId,
        action: AUDIT_ACTIONS.BULK_DELETE_USERS,
        category: 'user_management',
        details: `Deleted ${userIds.length} users`,
        success: true,
      });

      return NextResponse.json({ 
        success: true, 
        message: `${userIds.length} users deleted` 
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
      { $set: updateData }
    );

    void writeAuditLogFromRequest(request, {
      adminId: admin.adminId,
      action: action === 'activate' ? AUDIT_ACTIONS.BULK_ACTIVATE_USERS : AUDIT_ACTIONS.BULK_DEACTIVATE_USERS,
      category: 'user_management',
      details: `${actionDescription} ${result.modifiedCount} users`,
      success: true,
    });

    return NextResponse.json({ 
      success: true, 
      message: `${result.modifiedCount} users ${actionDescription}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update users' },
      { status: 500 }
    );
  }
}
