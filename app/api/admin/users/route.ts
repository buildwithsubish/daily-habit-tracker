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
    const now = new Date();
    if (status === 'active') {
      query.isActive = { $ne: false };
      query.$or = [{ lockUntil: null }, { lockUntil: { $lte: now } }];
    } else if (status === 'inactive' || status === 'suspended') {
      query.isActive = false;
    } else if (status === 'rate_limited' || status === 'locked') {
      query.lockUntil = { $gt: now };
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [users, total, activeCount, inactiveCount, rateLimitedCount] = await Promise.all([
      User.find(query)
        .select('email username createdAt timeZone whatsappNumber whatsappNumberEncrypted whatsappAutomation whatsappVerified pollSchedule weeklyReportSchedule isActive lastLogin lockUntil loginAttempts')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      User.countDocuments({ isActive: { $ne: false }, $or: [{ lockUntil: null }, { lockUntil: { $lte: now } }] }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ lockUntil: { $gt: now } }),
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
      lockUntil?: Date | null;
      loginAttempts?: number;
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
        const isRateLimited = Boolean(user.lockUntil && new Date(user.lockUntil) > new Date());
        const lockRemainingMinutes = isRateLimited && user.lockUntil
          ? Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000)
          : 0;

        return {
          id: user._id.toString(),
          email: user.email,
          username: user.username || 'N/A',
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isActive: user.isActive !== false,
          isRateLimited,
          lockRemainingMinutes,
          lockUntil: user.lockUntil ? new Date(user.lockUntil).toISOString() : null,
          loginAttempts: user.loginAttempts || 0,
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
        rateLimited: rateLimitedCount,
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

    // Enforce RBAC: Viewers and Editors cannot mutate users
    if (!['super_admin', 'admin', 'manager'].includes(admin.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges to mutate users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userIds, action, confirmation } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs required' }, { status: 400 });
    }

    let updateData: any = {};
    let actionDescription = '';

    if (action === 'activate' || action === 'unsuspend' || action === 'unlock') {
      updateData = { isActive: true, lockUntil: null, loginAttempts: 0 };
      actionDescription = action === 'unlock' ? 'unlocked from rate limit' : 'activated';
    } else if (action === 'deactivate' || action === 'suspend') {
      updateData = { isActive: false };
      actionDescription = 'suspended';
    } else if (action === 'delete') {
      // Destructive safeguard: Only super_admin and admin can delete users
      if (!['super_admin', 'admin'].includes(admin.role)) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can permanently delete user accounts' },
          { status: 403 }
        );
      }

      // Secondary confirmation safeguard
      if (confirmation !== 'DELETE' && confirmation !== 'CONFIRM_BULK_DELETE') {
        return NextResponse.json(
          {
            error:
              'Secondary confirmation failed. Type "CONFIRM_BULK_DELETE" to confirm permanent deletion.',
          },
          { status: 400 }
        );
      }

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
        targetResourceId: userIds.join(','),
        action: AUDIT_ACTIONS.BULK_DELETE_USERS,
        category: 'user_management',
        details: `Deleted ${userIds.length} users with secondary confirmation safeguard verified.`,
        metadata: { count: userIds.length, userIds },
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
