import { NextRequest, NextResponse } from 'next/server';
import { triggerDailyMessages, triggerReminders } from '@/lib/whatsapp-automation';

/**
 * Manual trigger endpoint for WhatsApp scheduler
 * This allows sending messages immediately without waiting for cron
 * 
 * Usage:
 * - POST /api/scheduler/trigger?type=daily - Send daily habit messages
 * - POST /api/scheduler/trigger?type=reminders - Send reminders
 * - POST /api/scheduler/trigger?type=all - Send both
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const authHeader = request.headers.get('authorization');
    const cronSecret = authHeader?.replace('Bearer ', '') || '';
    const envCronSecret = process.env.CRON_SECRET || '';

    // Allow if CRON_SECRET matches OR if running in development without secret
    const isAuthorized = envCronSecret ? cronSecret === envCronSecret : true;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isAuthorized && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      daily: { sent: 0 },
      reminders: { remindersSent: 0 },
    };

    console.log(`[Scheduler Trigger] Manual trigger initiated for type: ${type}`);

    // Send daily messages
    if (type === 'daily' || type === 'all') {
      console.log('[Scheduler Trigger] Processing daily habit messages...');
      results.daily = await triggerDailyMessages();
      console.log(`[Scheduler Trigger] Daily messages sent: ${results.daily.sent}`);
    }

    // Send reminders
    if (type === 'reminders' || type === 'all') {
      console.log('[Scheduler Trigger] Processing reminders...');
      results.reminders = await triggerReminders();
      console.log(`[Scheduler Trigger] Reminders sent: ${results.reminders.remindersSent}`);
    }

    const totalSent = (results.daily?.sent || 0) + (results.reminders?.remindersSent || 0);

    return NextResponse.json({
      success: true,
      message: `Processed ${type} scheduler tasks`,
      results,
      summary: {
        dailyMessages: results.daily?.sent || 0,
        reminders: results.reminders?.remindersSent || 0,
        total: totalSent,
      },
    });
  } catch (error: any) {
    console.error('[Scheduler Trigger] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger scheduler' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check scheduler status
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'WhatsApp Scheduler Trigger API',
    usage: 'POST /api/scheduler/trigger?type=daily|reminders|all',
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasCronSecret: !!process.env.CRON_SECRET,
    },
  });
}

