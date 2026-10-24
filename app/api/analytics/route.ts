import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyLog from '@/lib/models/DailyLog';
import Habit from '@/lib/models/Habit';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware';
import { getDaysAgo, getToday, isHabitScheduled } from '@/lib/utils';
import mongoose from 'mongoose';

// Generate continuous array of YYYY-MM-DD dates between start and end (inclusive)
function generateDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startStr}T12:00:00Z`);
  const end = new Date(`${endStr}T12:00:00Z`);

  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

function shiftDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period'); // weekly, monthly, yearly, custom
    const daysParam = searchParams.get('days');
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');
    const includeHidden = searchParams.get('includeHidden') === 'true';

    let startDate: string;
    let endDate: string = customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customEnd) ? customEnd : getToday();

    if (customStart && /^\d{4}-\d{2}-\d{2}$/.test(customStart)) {
      startDate = customStart;
      if (startDate > endDate) {
        startDate = endDate;
      }
    } else if (period === 'weekly') {
      startDate = getDaysAgo(7);
    } else if (period === 'monthly') {
      startDate = getDaysAgo(30);
    } else if (period === 'yearly') {
      startDate = getDaysAgo(365);
    } else if (daysParam && !isNaN(parseInt(daysParam))) {
      startDate = getDaysAgo(parseInt(daysParam));
    } else {
      startDate = getDaysAgo(30);
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    // 1. Fetch user habits
    const habitQuery: any = { userId: userIdObj, active: { $ne: false } };
    if (!includeHidden) {
      habitQuery.hidden = { $ne: true };
    }
    const habitsRaw = await Habit.find(habitQuery).lean();
    const habits = habitsRaw as any[];

    // 2. Fetch logs within date range
    const logs = await DailyLog.find({
      userId: userIdObj,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Map logs by `date:habitId` -> Set of completed step indexes (or null for single-step)
    // and track raw log data
    const completedStepsMap = new Map<string, Set<number | null>>();
    const partialStepsMap = new Map<string, Set<number | null>>();

    for (const log of logs as any[]) {
      if (!log.completed) continue;
      const key = `${log.date}:${log.habitId.toString()}`;
      if (!completedStepsMap.has(key)) {
        completedStepsMap.set(key, new Set());
      }
      completedStepsMap.get(key)!.add(log.stepIndex ?? null);
    }

    // Check if habit is fully completed on a given date
    const isHabitFullyCompleted = (habit: any, date: string): boolean => {
      const key = `${date}:${habit._id.toString()}`;
      const completedSteps = completedStepsMap.get(key);
      if (!completedSteps) return false;

      if (habit.type === 'single-step') {
        return completedSteps.has(null) || completedSteps.size > 0;
      }

      // Multi-step: all steps must be completed
      const stepCount = Array.isArray(habit.steps) ? habit.steps.length : 0;
      if (stepCount === 0) return completedSteps.size > 0;
      for (let i = 0; i < stepCount; i++) {
        if (!completedSteps.has(i)) return false;
      }
      return true;
    };

    // Check if habit is partially completed on a given date
    const isHabitPartiallyCompleted = (habit: any, date: string): boolean => {
      if (habit.type !== 'multi-step') return false;
      const key = `${date}:${habit._id.toString()}`;
      const completedSteps = completedStepsMap.get(key);
      if (!completedSteps || completedSteps.size === 0) return false;
      return !isHabitFullyCompleted(habit, date);
    };

    // 3. Compute continuous daily stats with accurate denominators
    const dateRange = generateDateRange(startDate, endDate);
    const formattedCompletionStats: Array<{
      date: string;
      total: number;
      completed: number;
      partial: number;
      rate: number;
    }> = [];

    let totalScheduledOccurrences = 0;
    let totalCompletedOccurrences = 0;
    let totalPartialOccurrences = 0;

    for (const d of dateRange) {
      let scheduledCount = 0;
      let completedCount = 0;
      let partialCount = 0;

      for (const habit of habits) {
        if (isHabitScheduled(habit, d)) {
          scheduledCount++;
          if (isHabitFullyCompleted(habit, d)) {
            completedCount++;
          } else if (isHabitPartiallyCompleted(habit, d)) {
            partialCount++;
          }
        }
      }

      totalScheduledOccurrences += scheduledCount;
      totalCompletedOccurrences += completedCount;
      totalPartialOccurrences += partialCount;

      const rate = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

      formattedCompletionStats.push({
        date: d,
        total: scheduledCount,
        completed: completedCount,
        partial: partialCount,
        rate,
      });
    }

    // 4. Compute Habit-wise stats (with denominators)
    const habitStats = habits.map((habit) => {
      let scheduledCount = 0;
      let completedCount = 0;
      let partialCount = 0;

      for (const d of dateRange) {
        if (isHabitScheduled(habit, d)) {
          scheduledCount++;
          if (isHabitFullyCompleted(habit, d)) {
            completedCount++;
          } else if (isHabitPartiallyCompleted(habit, d)) {
            partialCount++;
          }
        }
      }

      const successRate = scheduledCount > 0 
        ? Math.round((completedCount / scheduledCount) * 100) 
        : null;

      return {
        id: habit._id.toString(),
        name: habit.name,
        category: habit.category,
        type: habit.type,
        stepsCount: Array.isArray(habit.steps) ? habit.steps.length : 1,
        totalScheduled: scheduledCount,
        totalLogs: scheduledCount, // backward compatibility
        completedLogs: completedCount,
        partialLogs: partialCount,
        rate: successRate,
        hidden: Boolean(habit.hidden),
      };
    });

    // 5. Schedule-Aware Streaks (Walk backward up to 365 days)
    const streakStartDate = shiftDateStr(endDate, -365);
    const streakLogs = await DailyLog.find({
      userId: userIdObj,
      date: { $gte: streakStartDate, $lte: endDate },
      completed: true,
    }).lean();

    const streakCompletedSteps = new Map<string, Set<number | null>>();
    for (const log of streakLogs as any[]) {
      const key = `${log.date}:${log.habitId.toString()}`;
      if (!streakCompletedSteps.has(key)) {
        streakCompletedSteps.set(key, new Set());
      }
      streakCompletedSteps.get(key)!.add(log.stepIndex ?? null);
    }

    const checkCompleteForStreak = (habit: any, date: string): boolean => {
      const key = `${date}:${habit._id.toString()}`;
      const completedSteps = streakCompletedSteps.get(key);
      if (!completedSteps) return false;
      if (habit.type === 'single-step') return true;
      const stepCount = Array.isArray(habit.steps) ? habit.steps.length : 0;
      if (stepCount === 0) return completedSteps.size > 0;
      for (let i = 0; i < stepCount; i++) {
        if (!completedSteps.has(i)) return false;
      }
      return true;
    };

    const streakMap = new Map<string, { current: number; longest: number; lastDate: string | null }>();

    for (const habit of habits) {
      const habitId = habit._id.toString();
      let current = 0;
      let longest = 0;
      let runningStreak = 0;
      let lastDate: string | null = null;

      // Start from today or yesterday if today is not yet due/logged
      let cursor = endDate;
      const todayIsScheduled = isHabitScheduled(habit, cursor);
      const todayDone = checkCompleteForStreak(habit, cursor);

      if (!todayDone && !todayIsScheduled) {
        cursor = shiftDateStr(cursor, -1);
      } else if (!todayDone && todayIsScheduled) {
        // If today is scheduled but not finished yet, allow streak to continue from yesterday
        cursor = shiftDateStr(cursor, -1);
      }

      // Walk backward for current streak
      let walk = cursor;
      for (let i = 0; i < 365; i++) {
        if (isHabitScheduled(habit, walk)) {
          if (checkCompleteForStreak(habit, walk)) {
            current++;
            if (!lastDate) lastDate = walk;
          } else {
            // First missed scheduled day breaks current streak
            break;
          }
        }
        walk = shiftDateStr(walk, -1);
      }

      // Calculate longest streak by scanning forward
      runningStreak = 0;
      longest = current;
      let scan = streakStartDate;
      while (scan <= endDate) {
        if (isHabitScheduled(habit, scan)) {
          if (checkCompleteForStreak(habit, scan)) {
            runningStreak++;
            if (runningStreak > longest) longest = runningStreak;
          } else {
            runningStreak = 0;
          }
        }
        scan = shiftDateStr(scan, 1);
      }

      streakMap.set(habitId, { current, longest: Math.max(longest, current), lastDate });
    }

    // 6. Heatmap Data (Last 365 days)
    const heatmapStart = new Date();
    heatmapStart.setDate(heatmapStart.getDate() - 365);
    const heatmapLogs = await DailyLog.find({
      userId: userIdObj,
      date: { $gte: heatmapStart.toISOString().split('T')[0] },
      completed: true,
    }).lean();

    const heatmap: Record<string, number> = {};
    (heatmapLogs as any[]).forEach((log) => {
      const d = log.date;
      heatmap[d] = (heatmap[d] || 0) + 1;
    });

    // 7. Weekday Distribution Analysis
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayBuckets: Record<number, { scheduled: number; completed: number }> = {
      0: { scheduled: 0, completed: 0 },
      1: { scheduled: 0, completed: 0 },
      2: { scheduled: 0, completed: 0 },
      3: { scheduled: 0, completed: 0 },
      4: { scheduled: 0, completed: 0 },
      5: { scheduled: 0, completed: 0 },
      6: { scheduled: 0, completed: 0 },
    };

    for (const stat of formattedCompletionStats) {
      const dayIdx = new Date(`${stat.date}T12:00:00Z`).getUTCDay();
      weekdayBuckets[dayIdx].scheduled += stat.total;
      weekdayBuckets[dayIdx].completed += stat.completed;
    }

    const weekdayList = [1, 2, 3, 4, 5, 6, 0].map((idx) => {
      const b = weekdayBuckets[idx];
      const rate = b.scheduled > 0 ? Math.round((b.completed / b.scheduled) * 100) : 0;
      return {
        day: dayNames[idx],
        dayIndex: idx,
        scheduled: b.scheduled,
        completed: b.completed,
        rate,
      };
    });

    // 8. Trend: Week-over-week
    const recent7 = formattedCompletionStats.slice(-7);
    const prev7 = formattedCompletionStats.slice(-14, -7);
    const r7 = recent7.reduce((a, s) => a + (s.total > 0 ? s.completed / s.total : 0), 0) / Math.max(recent7.length, 1);
    const p7 = prev7.reduce((a, s) => a + (s.total > 0 ? s.completed / s.total : 0), 0) / Math.max(prev7.length, 1);
    const trendPct = p7 > 0 ? Math.round(((r7 - p7) / p7) * 100) : 0;

    // 9. Weight Analytics
    const userDoc = await User.findById(userIdObj)
      .select('weight lastWeightUpdate weightHistory healthGoal')
      .lean();
    const typedUserDoc = userDoc as any;
    const rawHistory = (typedUserDoc?.weightHistory || []).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    let weightHistory = [...rawHistory];
    if (!typedUserDoc?.weightHistory && typeof typedUserDoc?.weight === 'number' && typedUserDoc.weight > 0) {
      const initDate = typedUserDoc.lastWeightUpdate 
        ? new Date(typedUserDoc.lastWeightUpdate).toISOString().split('T')[0]
        : getToday();
      weightHistory = [{ weight: typedUserDoc.weight, date: initDate, note: 'Initial calibration' }];
    }

    const isBaselineOnly = weightHistory.length === 1;
    const currentWeight = typedUserDoc?.weight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null);
    const startingWeight = weightHistory.length > 0 ? weightHistory[0].weight : currentWeight;
    const totalChange = isBaselineOnly 
      ? null 
      : (currentWeight !== null && startingWeight !== null ? +(currentWeight - startingWeight).toFixed(1) : 0);

    // Monthly aggregates
    const monthlyMap = new Map<string, { total: number; count: number; lastWeight: number }>();
    weightHistory.forEach((item: any) => {
      const monthKey = item.date.substring(0, 7);
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { total: 0, count: 0, lastWeight: item.weight });
      }
      const m = monthlyMap.get(monthKey)!;
      m.total += item.weight;
      m.count += 1;
      m.lastWeight = item.weight;
    });

    const monthlyStats = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      avgWeight: +(data.total / data.count).toFixed(1),
      lastWeight: data.lastWeight,
      logCount: data.count,
    }));

    return NextResponse.json({
      startDate,
      endDate,
      totalScheduled: totalScheduledOccurrences,
      totalCompleted: totalCompletedOccurrences,
      totalPartial: totalPartialOccurrences,
      overallCompletionRate: totalScheduledOccurrences > 0 
        ? Math.round((totalCompletedOccurrences / totalScheduledOccurrences) * 100) 
        : null,
      completionStats: formattedCompletionStats,
      habitStats,
      streaks: Object.fromEntries(streakMap),
      heatmap,
      weekdayStats: weekdayList,
      trend: {
        thisWeekRate: Math.round(r7 * 100),
        prevWeekRate: Math.round(p7 * 100),
        changePercent: trendPct,
      },
      weightStats: {
        currentWeight,
        startingWeight,
        totalChange,
        isBaselineOnly,
        lastWeightUpdate: typedUserDoc?.lastWeightUpdate || null,
        healthGoal: typedUserDoc?.healthGoal || 'maintain',
        history: weightHistory,
        monthlyStats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
