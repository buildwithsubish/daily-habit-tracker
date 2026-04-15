import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import whatsappManager, { 
  sendDailyHabitMessages, 
  processReminders, 
  createPollForUser,
  getPollResults,
  sendPollConfirmation,
  processAllUserPolls,
  checkPendingPolls,
  generateWeeklyReport,
  sendWeeklyReports,
  checkInactivity,
  startScheduler,
  stopScheduler,
  getSchedulerStatus
} from '@/lib/whatsapp-manager';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, pollId } = body;

    switch (action) {
      case 'start_scheduler':
        startScheduler();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler started',
          status: getSchedulerStatus()
        });

      case 'stop_scheduler':
        stopScheduler();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler stopped',
          status: getSchedulerStatus()
        });

      case 'get_status':
        return NextResponse.json({ 
          success: true, 
          status: getSchedulerStatus()
        });

      case 'send_daily_messages':
        const dailyResult = await sendDailyHabitMessages();
        return NextResponse.json({ 
          success: true, 
          ...dailyResult 
        });

      case 'process_reminders':
        const reminderResult = await processReminders();
        return NextResponse.json({ 
          success: true, 
          ...reminderResult 
        });

      case 'create_poll':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }
        const pollResult = await createPollForUser(userId);
        return NextResponse.json(pollResult);

      case 'get_poll_results':
        if (!pollId) {
          return NextResponse.json({ error: 'Poll ID required' }, { status: 400 });
        }
        const results = await getPollResults(pollId);
        return NextResponse.json(results);

      case 'send_confirmation':
        if (!userId || !pollId) {
          return NextResponse.json({ error: 'User ID and Poll ID required' }, { status: 400 });
        }
        const confirmation = await sendPollConfirmation(userId, pollId);
        return NextResponse.json(confirmation);

      case 'process_all_polls':
        const pollProcessResult = await processAllUserPolls();
        return NextResponse.json({ 
          success: true, 
          ...pollProcessResult 
        });

      case 'check_pending_polls':
        const pendingResult = await checkPendingPolls();
        return NextResponse.json({ 
          success: true, 
          ...pendingResult 
        });

      case 'send_weekly_reports':
        const weeklyResult = await sendWeeklyReports();
        return NextResponse.json({ 
          success: true, 
          ...weeklyResult 
        });

      case 'check_inactivity':
        const inactivityResult = await checkInactivity();
        return NextResponse.json({ 
          success: true, 
          ...inactivityResult 
        });

      case 'run_full_cycle':
        startScheduler();
        const daily = await sendDailyHabitMessages();
        const reminders = await processReminders();
        const polls = await processAllUserPolls();
        return NextResponse.json({
          success: true,
          message: 'Full cycle initiated',
          results: { daily, reminders, polls }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[WhatsApp Automation API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      status: getSchedulerStatus()
    });
  } catch (error: any) {
    console.error('[WhatsApp Automation API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
