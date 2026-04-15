import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import MessageLog from '@/lib/models/MessageLog';
import { sendWhatsAppMessage, formatDashboardSummary, DashboardSummaryData } from '@/lib/whatsapp';
import { getToday, getDaysAgo } from '@/lib/utils';

// Secured by API secret — called by external cron service
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const body = await request.json().catch(() => ({}));
        const secret = authHeader?.replace('Bearer ', '') || body.secret;

        if (!CRON_SECRET || secret !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const today = getToday();
        const dayOfWeek = new Date().getDay(); // 0=Sunday

        // Find all users with automation enabled
        const users = await User.find({
            whatsappAutomation: true,
            whatsappNumber: { $ne: '' },
        }).lean();

        const results: Array<{ userId: string; status: string; error?: string }> = [];

        for (const user of users as any[]) {
            try {
                // Check if already sent today
                const existingLog = await MessageLog.findOne({
                    userId: user._id,
                    date: today,
                    type: 'summary',
                });

                if (existingLog) {
                    results.push({ userId: user._id.toString(), status: 'already_sent' });
                    continue;
                }

                // Gather dashboard data for this user
                const habits = await Habit.find({ userId: user._id }).sort({ order: 1 }).lean();

                // Filter habits that have WhatsApp enabled and respect frequency settings
                const enabledHabits = (habits as any[]).filter(h => {
                  if (!h.whatsappEnabled) return false;
                  
                  // Skip manual frequency habits (should only be sent on demand)
                  if (h.whatsappFrequency === 'manual') return false;
                  
                  // Handle daily frequency
                  if (h.whatsappFrequency === 'daily') return true;
                  
                  // Handle weekly frequency - only on Monday (dayOfWeek === 1)
                  if (h.whatsappFrequency === 'weekly' && dayOfWeek === 1) return true;
                  
                  // Handle smart frequency - for now, treat like daily
                  // TODO: Implement intelligent timing based on user's typical activity patterns
                  if (h.whatsappFrequency === 'smart') return true;
                  
                  return false;
                });

                // If no habits to send, skip this user
                if (enabledHabits.length === 0) {
                  results.push({ userId: user._id.toString(), status: 'skipped_no_enabled_habits' });
                  continue;
                }

                // Get today's completion status
                const todayLogs = await DailyLog.find({
                    userId: user._id,
                    date: today,
                }).lean();

                const completedHabitIds = new Set(
                    (todayLogs as any[]).filter(l => l.completed).map(l => l.habitId.toString())
                );

                // Get completion stats for the last 7 days
                const weekAgo = getDaysAgo(7);
                const weekLogs = await DailyLog.find({
                    userId: user._id,
                    date: { $gte: weekAgo, $lte: today },
                }).lean();

                const totalWeekLogs = (weekLogs as any[]).length;
                const completedWeekLogs = (weekLogs as any[]).filter(l => l.completed).length;
                const completionRate = totalWeekLogs > 0 ? Math.round((completedWeekLogs / totalWeekLogs) * 100) : 0;

                // Calculate consistency (days with at least 1 completion)
                const daysWithCompletion = new Set(
                    (weekLogs as any[]).filter(l => l.completed).map(l => l.date)
                ).size;
                const consistencyRate = Math.round((daysWithCompletion / 7) * 100);

                // Streak calculation (simplified)
                let currentStreak = 0;
                let longestStreak = 0;
                for (const habit of habits as any[]) {
                    if (habit.streak > currentStreak) currentStreak = habit.streak;
                    longestStreak = Math.max(longestStreak, habit.streak);
                }

                // Weekly trend (this week vs last week)
                const twoWeeksAgo = getDaysAgo(14);
                const prevWeekLogs = await DailyLog.find({
                    userId: user._id,
                    date: { $gte: twoWeeksAgo, $lt: weekAgo },
                }).lean();

                const prevTotal = (prevWeekLogs as any[]).length;
                const prevCompleted = (prevWeekLogs as any[]).filter(l => l.completed).length;
                const prevRate = prevTotal > 0 ? (prevCompleted / prevTotal) * 100 : 0;
                const weeklyTrend = prevRate > 0 ? Math.round(((completionRate - prevRate) / prevRate) * 100) : 0;

                // Build the summary data
                const summaryData: DashboardSummaryData = {
                    username: user.username || user.email?.split('@')[0] || 'Champion',
                    habits: enabledHabits.map(h => ({
                        name: h.name,
                        category: h.category,
                        completed: completedHabitIds.has(h._id.toString()),
                    })),
                    completionRate,
                    currentStreak,
                    longestStreak,
                    consistencyRate,
                    weeklyTrend,
                    totalHabitsToday: enabledHabits.length,
                    completedToday: enabledHabits.filter(h => completedHabitIds.has(h._id.toString())).length,
                };

                // Format and send
                const message = formatDashboardSummary(summaryData);
                const contactName = user.whatsappContactName || user.username;
                const result = await sendWhatsAppMessage(user.whatsappNumber, message, contactName);

                // Log the message
                await MessageLog.create({
                    userId: user._id,
                    type: 'summary',
                    status: result.ok ? 'sent' : 'failed',
                    content: message,
                    date: today,
                    messageId: result.ok ? (result as any).messageId || '' : '',
                    reminderCount: 0,
                    escalatedToAdmin: false,
                });

                results.push({
                    userId: user._id.toString(),
                    status: result.ok ? 'sent' : 'failed',
                    error: result.ok ? undefined : (result as any).error,
                });
            } catch (userError: any) {
                console.error(`Failed to send summary to user ${user._id}:`, userError);
                results.push({
                    userId: user._id.toString(),
                    status: 'error',
                    error: userError.message,
                });
            }
        }

        return NextResponse.json({
            success: true,
            date: today,
            processed: results.length,
            sent: results.filter(r => r.status === 'sent').length,
            failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
            skipped: results.filter(r => r.status === 'skipped_weekly' || r.status === 'already_sent').length,
            details: results,
        });
    } catch (error: any) {
        console.error('Daily summary cron error:', error);
        return NextResponse.json(
            { error: error.message || 'Daily summary failed' },
            { status: 500 }
        );
    }
}
