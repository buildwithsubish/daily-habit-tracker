import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import { requireAdmin } from '@/lib/admin-middleware';
import { initAdmin } from '@/lib/init-admin';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    // Initialize admin if not exists
    await initAdmin();
    requireAdmin(request); // Ensure admin is authenticated
    
    const userIdObj = new mongoose.Types.ObjectId();
    
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get total habits
    const totalHabits = await Habit.countDocuments();
    
    // Get total logs
    const totalLogs = await DailyLog.countDocuments();
    
    // Get completion rate
    const completedLogs = await DailyLog.countDocuments({ completed: true });
    const completionRate = totalLogs > 0 ? (completedLogs / totalLogs) * 100 : 0;
    
    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    
    // Get habits by category
    const habitsByCategory = await Habit.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    // Get top habits
    const topHabits = await DailyLog.aggregate([
      {
        $match: { completed: true },
      },
      {
        $group: {
          _id: '$habitId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    
    // Get habit details for top habits
    const topHabitIds = topHabits.map(h => new mongoose.Types.ObjectId(h._id));
    const topHabitDetails = await Habit.find({
      _id: { $in: topHabitIds },
    }).lean();
    
    const topHabitsWithNames = topHabits.map(habit => {
      const habitDetail = topHabitDetails.find(
        h => h._id.toString() === habit._id.toString()
      );
      return {
        name: habitDetail?.name || 'Unknown',
        category: habitDetail?.category || 'Unknown',
        completions: habit.count,
      };
    });
    
    // Get daily activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyActivity = await DailyLog.aggregate([
      {
        $match: {
          date: { $gte: thirtyDaysAgo.toISOString().split('T')[0] },
        },
      },
      {
        $group: {
          _id: '$date',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    return NextResponse.json({
      totalUsers,
      totalHabits,
      totalLogs,
      completedLogs,
      completionRate: Math.round(completionRate * 100) / 100,
      recentUsers,
      habitsByCategory: habitsByCategory.map(h => ({
        category: h._id,
        count: h.count,
      })),
      topHabits: topHabitsWithNames,
      dailyActivity: dailyActivity.map(d => ({
        date: d._id,
        total: d.total,
        completed: d.completed,
      })),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

