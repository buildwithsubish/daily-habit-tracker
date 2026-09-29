import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import whatsappManager, { 
  getPollResults,
  createPollForUser,
  sendPollConfirmation,
  checkPendingPolls,
  processAdvancedPollStatusChecks,
  sendDailyHabitMessages,
  processReminders,
  processAllUserPolls,
  sendWeeklyReports,
  checkInactivity,
  checkMessageStatus,
  getPollStatus,
  parsePollResults,
  getPythonHealth,
  listPythonSessions,
  validateSession,
  queueWAOperation,
  processPendingWATasks,
  ensureWhatsAppReady,
  // Contact routes now fully integrated for platform use
  createWhatsAppContact,
  openOrCreateWhatsAppContact,
  checkWhatsAppContactExists,
  // Cleanup for processed (24h) + pending/scheduled (by next day) to support claim-first no-dup
  cleanupOldWARecords
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
    let { action, userId, pollId } = body;

    // Legacy dashboard action names → whatsapp_server-integrated routes
    const actionAliases: Record<string, string> = {
      send_daily: 'send_daily_messages',
      send_reminder: 'process_reminders',
      send_poll: 'process_all_polls',
      send_summary: 'send_weekly_reports',
    };
    if (action && actionAliases[action]) {
      action = actionAliases[action];
    }

    switch (action) {
      case 'start_scheduler':
      case 'stop_scheduler':
        return NextResponse.json({
          success: false,
          error: 'Automatic WhatsApp scheduling is disabled. Use a direct action endpoint when needed.',
        }, { status: 410 });

      case 'get_status':
        return NextResponse.json({ 
          success: true, 
          status: { running: false, enabled: false, mode: 'manual-api-only', jobs: [] }
        });

      case 'send_daily_messages':
        const daily = await sendDailyHabitMessages({ manual: true });
        return NextResponse.json({ success: true, result: daily });

      case 'process_reminders':
        const reminders = await processReminders();
        return NextResponse.json({ success: true, result: reminders });

      case 'create_poll':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }
        const createdPoll = await createPollForUser(userId, undefined, adminId);
        return NextResponse.json(createdPoll, { status: createdPoll.success ? 200 : 502 });

      case 'get_poll_results':
        if (!pollId) {
          return NextResponse.json({ error: 'Poll ID required' }, { status: 400 });
        }
        const results = await queueWAOperation(() => getPollResults(pollId), 'automation-get-poll-results');
        return NextResponse.json(results);

      case 'send_confirmation':
        if (!userId || !pollId) {
          return NextResponse.json({ error: 'User ID and Poll ID required' }, { status: 400 });
        }
        const confirmation = await queueWAOperation(() => sendPollConfirmation(userId, pollId), 'automation-send-confirmation');
        return NextResponse.json(confirmation);

      case 'process_all_polls':
        const polls = await processAllUserPolls({ manual: true });
        return NextResponse.json({ success: true, result: polls });

      case 'check_pending_polls':
        // Check/reads can be direct (with queue serial); not a "send trigger" so no need enqueue for throttle.
        const pendingResult = await queueWAOperation(async () => {
          const ready = await ensureWhatsAppReady(true);
          if (!ready) throw new Error('WhatsApp not connected');
          return checkPendingPolls();
        }, 'manual-check-polls');
        return NextResponse.json({
          success: true,
          message: `Poll checks: ${pendingResult?.completed ?? 0} completed, ${pendingResult?.failed ?? 0} failed`,
          ...pendingResult,
        });

      case 'send_weekly_reports':
        const weekly = await sendWeeklyReports();
        return NextResponse.json({ success: true, result: weekly });

      case 'check_inactivity':
        const inactivity = await checkInactivity();
        return NextResponse.json({ success: true, result: inactivity });

      case 'run_full_cycle':
      case 'run_full_pipeline':
        return NextResponse.json({
          success: false,
          error: 'WhatsApp pipelines are disabled. Call an individual API action instead.',
        }, { status: 410 });

      case 'check_message_status':
        const { phone, contact } = body;
        const msgStatus = await queueWAOperation(() => checkMessageStatus(phone, contact), 'manual-check-msg-status');
        return NextResponse.json({ success: true, status: msgStatus.status || msgStatus, error: msgStatus.error });

      case 'get_poll_status':
        if (!body.contact) return NextResponse.json({ error: 'contact required' }, { status: 400 });
        const pStatus = await queueWAOperation(() => getPollStatus(body.contact, body.question), 'manual-get-poll-status');
        return NextResponse.json({ success: true, status: pStatus.status || pStatus, error: pStatus.error });

      case 'parse_poll_results':
        if (!body.contact) return NextResponse.json({ error: 'contact required' }, { status: 400 });
        const parsed = await queueWAOperation(() => parsePollResults(body.contact, body.question), 'manual-parse-poll-results');
        return NextResponse.json({ success: true, options: parsed.options, total_votes: parsed.total_votes, error: parsed.error });

      case 'process_poll_status_checks':
        const statusRes = await queueWAOperation(() => processAdvancedPollStatusChecks(), 'manual-process-poll-status-checks');
        return NextResponse.json({ success: true, ...statusRes });

      case 'process_wa_tasks':
        // Manual drain from admin UI / tools: process up to 10 pending DB tasks one-by-one (via queue)
        const drainRes = await queueWAOperation(() => processPendingWATasks(10), 'manual-drain-wa-tasks');
        return NextResponse.json({ success: true, ...drainRes, message: 'Drained pending WA tasks (one-by-one via DB queue)' });

      case 'get_health':
        const health = await getPythonHealth();
        return NextResponse.json({ success: true, health: health.health || health, error: health.error });

      case 'list_py_sessions':
        const sessions = await listPythonSessions();
        return NextResponse.json({ success: true, sessions: sessions.sessions || sessions });

      case 'validate_session':
        const v = await validateSession();
        return NextResponse.json({ success: true, valid: v.valid, reason: v.reason, needs_reauth: v.needs_reauth, detail: v });

      case 'take_screenshot':
        // Delegate to manager (already exported)
        const shot = await (whatsappManager as any).takeWhatsAppScreenshot ? await (whatsappManager as any).takeWhatsAppScreenshot(body.filename) : { success: false, error: 'not available' };
        return NextResponse.json({ success: true, screenshot: shot });

      case 'list_screenshots':
        const shots = await (whatsappManager as any).listWhatsAppScreenshots ? await (whatsappManager as any).listWhatsAppScreenshots() : { screenshots: [] };
        return NextResponse.json({ success: true, screenshots: shots.screenshots || shots });

      case 'cleanup_wa_records':
        // Manual/admin trigger for the 24h processed cleanup + stale pending/scheduled prune (by next day)
        const cl = await cleanupOldWARecords();
        return NextResponse.json({ success: true, message: 'WA records cleanup (processed>24h + old pending/sch) executed', result: cl });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[WhatsApp Automation API] Error:', error);
    const msg = error?.message || 'Internal server error';
    const isWa = /whatsapp|not connected|offline/i.test(msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: isWa ? 503 : 500 }
    );
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
      status: { running: false, enabled: false, mode: 'manual-api-only', jobs: [] }
    });
  } catch (error: any) {
    console.error('[WhatsApp Automation API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
