import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import DailyLog from '@/lib/models/DailyLog';
import MessageLog from '@/lib/models/MessageLog';
import ReminderLog from '@/lib/models/ReminderLog';
import WhatsAppPoll from '@/lib/models/WhatsAppPoll';
import WeeklyAnalytics from '@/lib/models/WeeklyAnalytics';
import AuditLog from '@/lib/models/AuditLog';
import WhatsAppTask from '@/lib/models/WhatsAppTask';
import connectDB from '@/lib/mongodb';
import { getAdminSessionIdSync, resolveAdminSessionId } from '@/lib/admin-session';
import { ExecutionTracker } from '@/lib/execution-report';
import { resolveSharedContactPhone, resolveUserPhone } from '@/lib/pii';
import { hashPhoneNumber } from './security';

function userPhone(user: { whatsappNumber?: string; whatsappNumberEncrypted?: string; whatsappNumberHash?: string } | null | undefined): string | null {
  return resolveUserPhone(user);
}
import { getPythonServerUrl, getPythonWhatsAppClient } from '@/lib/python-whatsapp-client';
import { sendWhatsAppMessage } from './whatsapp';

const PYTHON_SERVER_URL = getPythonServerUrl();

const POLL_QUESTIONS = [
  'What are the completed daily tasks?',
  'Which tasks did you complete today?',
  'Tell us about your completed tasks!',
  'What tasks did you accomplish today?',
  'Share your completed tasks for today!',
  'Did you complete your daily tasks?',
  'Which daily tasks are done?',
];

const REMINDER_MESSAGES = [
  "⏰ *Reminder!* You haven't responded to your task list yet.",
  "📢 *Heads up!* Your daily tasks are waiting for confirmation.",
  "🔔 *Quick check!* Did you complete your tasks today?",
  "⏳ *Don't forget!* Your task list is still pending.",
  "📋 *Hey there!* Your habits poll is waiting for your response.",
  "💪 *Just checking in!* Have you completed your daily tasks?",
  "🎯 *Action time!* Your task poll needs your input.",
  "✨ *Friendly nudge!* Don't leave your habits hanging!",
  "🚀 *One minute!* Complete your tasks and respond to the poll.",
  "🌟 *Your streak matters!* Please confirm your completed tasks.",
  "🔹 *Quick update needed!* Let us know what you accomplished.",
  "📌 *Reminder alert!* Your daily poll is awaiting your reply.",
  "💫 *Stay on track!* Confirm your tasks for today.",
  "⚡ *Time to wrap up!* Share your completed habits.",
  "🎉 *Keep the momentum!* Tell us about your progress.",
];

const POLL_REMINDER_MESSAGES = [
  "📋 *Hey!* Your daily habit poll is waiting for you! Just reply with your completed habits.",
  "⏰ *Quick reminder!* Don't forget to vote on your habit poll. Which tasks did you complete today?",
  "💡 *Heads up!* Your daily poll is still pending. Let us know which habits you finished!",
  "🎯 *Just a nudge!* Your habit completion poll needs your response. What did you accomplish today?",
  "🌟 *Don't break the streak!* Please vote on your daily poll so we can track your progress!",
  "📢 *Reminder!* Your habit tracker wants to know - which tasks did you complete today?",
  "✨ *One last push!* Take a moment to vote on your daily habit poll.",
  "🔔 *Your habits matter!* Please respond to today's poll - what did you get done?",
  "🚀 *Action required!* Your daily habit poll is waiting for your input.",
  "💪 *Keep it going!* Tell us which habits you completed today by voting on the poll!",
];

const SEND_LEAD_MINUTES = 3;

const globalForWhatsapp = global as typeof globalThis & {
  waOperationQueue?: Promise<any>;
};

if (!globalForWhatsapp.waOperationQueue) globalForWhatsapp.waOperationQueue = Promise.resolve();

// For explicit poll operations; no timer-based pre-trigger runs in the app.
const preScheduledPollKeys: Set<string> = new Set(); // `${userId}_${today}`

export async function queueWAOperation<T>(
  operation: () => Promise<T>,
  label: string = 'WA operation'
): Promise<T> {
  const run = async (): Promise<T> => {
    console.log(`[WA Queue] ▶ Starting ${label}`);
    const t0 = Date.now();
    try {
      const res = await operation();
      console.log(`[WA Queue] ✔ Completed ${label} in ${Date.now() - t0}ms`);
      return res;
    } catch (err: any) {
      console.error(`[WA Queue] ✖ ${label} failed after ${Date.now() - t0}ms: ${err?.message}`);
      throw err;
    }
  };

  const task = globalForWhatsapp.waOperationQueue!.then(run, run);
  // Advance queue even when this task fails so later jobs can run
  globalForWhatsapp.waOperationQueue = task.then(() => null, () => null);
  return task;
}

export type WAAutomationOptions = { manual?: boolean };

/** Ensure Python WhatsApp driver is connected (reuses an already-open browser when possible).
 * Pass force=true for manual admin actions to get real-time status (bypass throttle) and auto-attempt reconnect if needed.
 */
export async function ensureWhatsAppReady(force: boolean = false): Promise<boolean> {
  const { default: whatsappClientManager } = await import('./whatsapp-web');
  return whatsappClientManager.ensureReady(getAdminSessionId(), force);
}

/**
 * DB-backed WhatsApp Task queue retained for legacy pending tasks and explicit API drains.
 * - Tasks are processed only when an authenticated API operation calls processPendingWATasks.
 * - After complete (send + any DB updates), mark processed:true + processedAt date.
 * - Prevents "dump" (flooding WA at once); tasks persist if overloaded/restart.
 * - Cleanup: old processed removed EOD, unprocessed kept till next day delete.
 * - Privacy: each task tied to specific userId; only that user's data used in op.
 */
export async function enqueueWATask(taskData: {
  adminId?: string;
  taskType: string;
  userId?: string;  // optional for batch tasks like daily/process polls from admin manual triggers
  targetPhone?: string;
  targetContact?: string;
  payload?: any;
  date?: string;
}): Promise<any> {
  await connectDB();
  const today = new Date().toISOString().split('T')[0];
  const task = await WhatsAppTask.create({
    adminId: taskData.adminId || null,
    taskType: taskData.taskType,
    userId: taskData.userId || null,  // batch ok
    targetPhone: taskData.targetPhone || '',
    targetContact: taskData.targetContact || '',
    payload: taskData.payload || {},
    date: taskData.date || today,
    processed: false,
    status: 'pending',
    createdAt: new Date(),
  });
  console.log(`[WA Task Queue] Enqueued ${taskData.taskType} for user ${taskData.userId || 'batch'} (id:${task._id})`);
  return task;
}

export async function processPendingWATasks(maxTasks: number = 1): Promise<{ processed: number; failed: number; details: string[] }> {
  await connectDB();
  let processed = 0;
  let failed = 0;
  const details: string[] = [];
  let tracker: ExecutionTracker | null = null;
  let reportUserId: string | null = null;

  for (let i = 0; i < maxTasks; i++) {
    // Atomic claim: mark as 'processing' immediately.
    // Prevents same task picked twice by concurrent 10s ticks / manual drains / restarts.
    // Claims 'pending' or stuck 'processing' (>2min old) for recovery after crash.
    // Claim only 'pending', or 'processing' that have been stuck for >2min (e.g. after restart/crash).
    // Atomic so no other tick/processor can claim the same task (prevents duplicate sends).
    const task = await WhatsAppTask.findOneAndUpdate(
      {
        processed: false,
        $or: [
          { status: 'pending' },
          { status: 'processing', updatedAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) } }
        ]
      },
      { $set: { status: 'processing', updatedAt: new Date() } },
      { sort: { createdAt: 1 }, new: true }
    ).lean();

    if (!task) break;

    const taskUserId = (task as any).userId?.toString() || null;
    if (!tracker) {
      reportUserId = taskUserId;
      tracker = new ExecutionTracker('WA Task Processor', reportUserId);
    } else if (taskUserId && !reportUserId) {
      reportUserId = taskUserId;
      tracker.setUserId(taskUserId);
    }

    try {
      await queueWAOperation(async () => {
        // For task processing from manual triggers (enqueued via admin UI), do NOT do ready check or auto-init here.
        // This prevents creating new chrome drivers/browser instances.
        // The WA session/browser may already be open from an explicit API connect call.
        // Just execute the action, which uses ONLY the py API routes (e.g. /poll/create, /message/send etc).
        // Serialization via queueWA ensures one-by-one.
        // If not ready, the route calls will fail naturally and task will be retried (set to pending).
        const userIdStr = (task as any).userId?.toString();
        if ((task as any).taskType === 'send_message') {
          const payload = (task as any).payload || {};
          const phone = (task as any).targetPhone || payload.phone || '';
          const contact = (task as any).targetContact || payload.contact || '';
          const msg = payload.message || payload.text || '';
          if (!phone && !contact) throw new Error('No target for send_message task');
          const sendRes = await sendWhatsAppMessage(phone, msg, contact);

          // Update linked MessageLog (e.g. from broadcast which creates 'broadcast'/'pending' log before enqueue) so it reflects the actual send result.
          const pl = (task as any).payload || {};
          if (pl.messageLogId) {
            try {
              const msgId = sendRes.ok ? (sendRes as { messageId?: string }).messageId : undefined;
              await MessageLog.findByIdAndUpdate(pl.messageLogId, {
                status: sendRes.ok ? 'sent' : 'failed',
                messageId: msgId,
                sentAt: new Date(),
                error: sendRes.ok ? '' : (sendRes as any).error || '',
              });
            } catch (e) {
              console.error('[WA Task] failed to update linked MessageLog for broadcast/queued send', e);
            }
          }

          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: sendRes.ok ? 'completed' : 'failed',
            result: sendRes,
            error: sendRes.ok ? null : (sendRes as any).error,
          });
          details.push(`send_message:${userIdStr}:${sendRes.ok ? 'ok' : 'fail'}`);
        } else if ((task as any).taskType === 'create_poll') {
          const res = await createPollForUser(userIdStr, undefined, undefined, true, true); // admin task from manual trigger -> force + skipEnsure (no driver init, just the /poll/create route)
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: res.success ? 'completed' : 'failed',
            result: res,
            error: res.success ? null : res.error,
          });
          details.push(`create_poll:${userIdStr}:${res.success ? 'ok' : 'fail'}`);
        } else if ((task as any).taskType === 'daily_habit_messages') {
          // Batch from admin manual trigger: executed one-by-one via task processor + queueWA (prevents new browser inits)
          const res = await sendDailyHabitMessages({ manual: true, skipEnsure: true });
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: (res.sent + res.failed > 0) ? 'completed' : 'failed',
            result: res,
          });
          details.push(`daily_messages:batch:${res.sent || 0}sent`);
        } else if ((task as any).taskType === 'process_all_polls') {
          const res = await processAllUserPolls({ manual: true, skipEnsure: true });
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: (res.sent + res.failed > 0) ? 'completed' : 'failed',
            result: res,
          });
          details.push(`process_polls:batch:${res.sent || 0}sent`);
        } else if ((task as any).taskType === 'process_reminders') {
          const res = await processReminders({ skipEnsure: true });
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: (res.sent + res.failed > 0) ? 'completed' : 'failed',
            result: res,
          });
          details.push(`reminders:batch:${res.sent || 0}sent`);
        } else if ((task as any).taskType === 'check_pending_polls') {
          const res = await checkPendingPolls({ skipEnsure: true });
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: 'completed',
            result: res,
          });
          details.push(`check_polls:batch:${res.completed || 0}completed`);
        } else if ((task as any).taskType === 'send_weekly_reports') {
          const res = await sendWeeklyReports({ skipEnsure: true });
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: (res.sent + res.failed > 0) ? 'completed' : 'failed',
            result: res,
          });
          details.push(`weekly:batch:${res.sent || 0}sent`);
        } else if ((task as any).taskType === 'check_inactivity') {
          const res = await checkInactivity({ skipEnsure: true });
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: 'completed',
            result: res,
          });
          details.push(`inactivity:batch:${res.alertsSent || 0}`);
        } else if ((task as any).taskType === 'run_full_pipeline' || (task as any).taskType === 'run_full_cycle') {
          const d = await sendDailyHabitMessages({ manual: true, skipEnsure: true });
          await new Promise(r => setTimeout(r, 1200));
          const r = await processReminders({ skipEnsure: true });
          await new Promise(r => setTimeout(r, 1200));
          const p = await processAllUserPolls({ manual: true, skipEnsure: true });
          const res = { daily: d, reminders: r, polls: p };
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: 'completed',
            result: res,
          });
          details.push(`full:batch:done`);
        } else if ((task as any).taskType === 'send_weekly') {
          const res = await generateWeeklyReport(userIdStr);
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: res.success ? 'completed' : 'failed',
            result: res,
          });
          details.push(`weekly:${userIdStr}:${res.success ? 'ok' : 'fail'}`);
        } else {
          // generic: just mark done (extend as needed)
          await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
            processed: true,
            processedAt: new Date(),
            status: 'completed',
            result: { note: 'no-op handler for ' + (task as any).taskType },
          });
        }
      }, `wa-task-${(task as any).taskType}-${(task as any)._id}`);

      processed++;
      tracker.record({ completed: 1, detail: details[details.length - 1] });
    } catch (err: any) {
      // also mark linked MessageLog failed (e.g. broadcast queued log) so it doesn't stay pending forever on permanent fail
      const pl = (task as any).payload || {};
      if (pl.messageLogId) {
        try {
          await MessageLog.findByIdAndUpdate(pl.messageLogId, {
            status: 'failed',
            error: err?.message || String(err),
            sentAt: new Date(),
          });
        } catch (e) { /* ignore */ }
      }

      await WhatsAppTask.findByIdAndUpdate((task as any)._id, {
        status: 'pending',  // reset to pending so it can be retried on next tick (processed:false keeps it in queue)
        processed: false,
        error: err?.message || String(err),
        updatedAt: new Date(),
      });
      failed++;
      const failDetail = `task-fail:${(task as any)._id}:${err?.message}`;
      details.push(failDetail);
      tracker.record({ failed: 1, error: failDetail });
      console.error('[WA Task] process error', err);
    }
  }

  if (processed + failed > 0) {
    console.log(`[WA Task Queue] Drained ${processed} processed, ${failed} failed this tick.`);
    if (tracker) await tracker.finish(true);
  }
  return { processed, failed, details };
}

// Centralized cleanup per user request:
// - if processed after 24 hrs: delete (terminal statuses)
// - if anything pending/scheduled: leave it (for today), remove by next day (stale scheduledFor/date/created < dayStart)
// Cleanup is available to explicit API operations; it is never started on app boot.
export async function cleanupOldWARecords(): Promise<void> {
  await connectDB();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todayStr = dayStart.toISOString().split('T')[0];

  try {
    // Processed after 24h: clean terminal (sent/failed etc). Keeps recent ~24h for any needed audit.
    await MessageLog.deleteMany({
      status: { $in: ['sent', 'delivered', 'responded', 'failed'] },
      $or: [
        { sentAt: { $lt: cutoff24h } },
        { createdAt: { $lt: cutoff24h } },
      ],
    });
    await WhatsAppPoll.deleteMany({
      status: { $in: ['sent', 'voted', 'completed', 'failed'] },
      $or: [
        { sentAt: { $lt: cutoff24h } },
        { createdAt: { $lt: cutoff24h } },
      ],
    });

    // Pending state: leave (today's), remove by next day. Any from prev days or missed schedule pruned.
    await MessageLog.deleteMany({
      status: { $in: ['scheduled', 'pending'] },
      $or: [
        { scheduledFor: { $lt: dayStart } },
        { date: { $lt: todayStr } },
        { createdAt: { $lt: dayStart } },
      ],
    });
    await WhatsAppPoll.deleteMany({
      status: { $in: ['pending', 'scheduled'] },
      $or: [
        { scheduledFor: { $lt: dayStart } },
        { date: { $lt: todayStr } },
        { createdAt: { $lt: dayStart } },
      ],
    });

    console.log('[WA Scheduler] cleanupOldWARecords done (processed>24h purged; old pending/scheduled removed by next day)');
  } catch (e) {
    console.error('[WA Scheduler] cleanupOldWARecords error:', e);
  }
}

/** Admin session ID — resolved from MongoDB cache; call resolveAdminSessionId() on startup. */
export function getAdminSessionId(): string {
  return getAdminSessionIdSync();
}

export { resolveAdminSessionId };

async function pythonApiRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  opts?: { skipEnsure?: boolean }
): Promise<T> {
  if (!opts?.skipEnsure) {
    const ready = await ensureWhatsAppReady();
    if (!ready) {
      throw new Error('WhatsApp is not connected. Call POST /api/admin/whatsapp/session with action "connect" first.');
    }
  }
  return getPythonWhatsAppClient().request<T>(endpoint, method, body, opts);
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDayOfWeek(date: Date = new Date()): number {
  return date.getDay();
}

function isHabitScheduledForToday(habit: any): boolean {
  const dayOfWeek = getDayOfWeek();
  const { schedule } = habit;

  if (schedule?.weekdays && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
  if (schedule?.weekends && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
  if (schedule?.custom && schedule.custom.includes(dayOfWeek)) return true;

  return !schedule?.weekdays && !schedule?.weekends && !schedule?.custom;
}

async function ensureContactExists(contactName: string, phoneNumber?: string, skipEnsure: boolean = false): Promise<{ success: boolean; existingContactName?: string; error?: string; action?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; action?: string; message?: string; error?: string; existing_contact_name?: string; existing_phone_number?: string }>(
      '/contact/open-or-create',
      'POST',
      { session_id: getAdminSessionId(), contact_name: contactName, phone_number: phoneNumber },
      { skipEnsure }
    );

    const resolvedName = result.existing_contact_name || contactName;

    // Always persist contact name tied to this phone (user's whatsappNumber) + implicitly the user via lookup by phone in DB.
    // This ensures "user contact along with user_id" mapping for correct targeting (prevents cross-user/third-party report leaks).
    if (phoneNumber && resolvedName) {
      try {
        await updateUserWhatsAppContactName(phoneNumber, resolvedName);
      } catch (dbError) {
        console.error('[WhatsApp] Failed to update user contact name:', dbError);
      }
    }

    if (result.action === 'already_exists' || result.action === 'opened' || result.action === 'created') {
      console.log(`[WhatsApp] Contact ensure via /contact/open-or-create: action=${result.action} for ${resolvedName}`);
    }

    if (!result.success) {
      // Still return success-ish if we have phone (send can fallback to phone num)
      if (phoneNumber) {
        return { success: true, action: result.action || 'fallback-phone', existingContactName: resolvedName };
      }
    }

    return {
      success: !!result.success,
      existingContactName: resolvedName,
      action: result.action,
      error: result.error
    };
  } catch (error: any) {
    // On error still allow send by phone if we have it (robustness)
    if (phoneNumber) {
      return { success: true, existingContactName: contactName, action: 'error-fallback', error: error.message };
    }
    return { success: false, error: error.message };
  }
}

// Helper function to update user's WhatsApp contact name in database
async function updateUserWhatsAppContactName(phoneNumber: string, contactName: string): Promise<void> {
  try {
    // Find user by whatsappNumber and update their contact name
    const normalized = phoneNumber.replace(/\D/g, '');
    const result = await User.findOneAndUpdate(
      {
        $or: [
          { whatsappNumberHash: hashPhoneNumber(normalized) },
          { whatsappNumber: normalized },
        ],
      },
      { whatsappContactName: contactName },
      { upsert: false, new: true }
    );

    if (result) {
      console.log(`[WhatsApp] Updated whatsappContactName for ${phoneNumber}: ${contactName}`);
    }
  } catch (error) {
    console.error(`[WhatsApp] Error updating contact name for ${phoneNumber}:`, error);
  }
}

// Helper function to get user's WhatsApp contact name
async function getUserWhatsAppContactName(phoneNumber: string): Promise<string | null> {
  try {
    const normalized = phoneNumber.replace(/\D/g, '');
    const user = await User.findOne({
      $or: [
        { whatsappNumberHash: hashPhoneNumber(normalized) },
        { whatsappNumber: normalized },
      ],
    }).select('whatsappContactName');
    return user?.whatsappContactName || null;
  } catch (error) {
    console.error(`[WhatsApp] Error getting contact name for ${phoneNumber}:`, error);
    return null;
  }
}

// Helper function to get the best contact name (priority: stored WhatsApp contact > username > phone)
async function getBestContactName(phoneNumber: string, username?: string): Promise<string> {
  // First priority: check DB for stored WhatsApp contact name (synced from WhatsApp)
  const storedContactName = await getUserWhatsAppContactName(phoneNumber);
  if (storedContactName && storedContactName.trim()) {
    return storedContactName.trim();
  }

  // Second priority: use username if provided
  if (username && username.trim()) {
    return username.trim();
  }

  // Third priority: fall back to phone number
  return phoneNumber;
}

async function saveWhatsAppSession(): Promise<{ success: boolean; sessionData?: string; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; session_data?: string; cookie_count?: number; error?: string }>(
      '/session/save',
      'POST',
      { session_id: getAdminSessionId() }
    );
    return { success: result.success, sessionData: result.session_data, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function setDbSession(sessionData: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; message?: string; error?: string }>(
      '/session/set-db',
      'POST',
      { session_id: getAdminSessionId(), session_data: sessionData }
    );
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function loadWhatsAppSession(sessionData: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; message?: string; error?: string }>(
      '/session/load',
      'POST',
      { session_id: getAdminSessionId(), session_data: sessionData }
    );
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function takeWhatsAppScreenshot(filename?: string): Promise<{ success: boolean; filename?: string; filepath?: string; error?: string }> {
  try {
    const result = await pythonApiRequest<{ success: boolean; filename?: string; filepath?: string; message?: string; error?: string }>(
      `/screenshot?session_id=${getAdminSessionId()}${filename ? `&filename=${filename}` : ''}`,
      'POST'
    );
    return { success: result.success, filename: result.filename, filepath: result.filepath, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function listWhatsAppScreenshots(): Promise<{ screenshots: Array<{ filename: string; filepath: string; size: number; created: string }> }> {
  try {
    const result = await pythonApiRequest<{ screenshots: Array<{ filename: string; filepath: string; size: number; created: string }> }>(
      '/screenshots',
      'GET'
    );
    return result;
  } catch (error: any) {
    return { screenshots: [] };
  }
}

// New wrappers to integrate ALL whatsapp_server.py routes correctly (using consistent admin session)
export async function checkMessageStatus(phone?: string, contact?: string): Promise<{ success: boolean; status?: any; error?: string }> {
  // whatsapp_server.py does not expose /message/check-status — infer via poll status when contact is known.
  if (contact) {
    return getPollStatus(contact);
  }
  return {
    success: false,
    error: 'Message status check requires a contact name (no /message/check-status on whatsapp_server.py)',
  };
}

// Contact routes integration (create/open/check via whatsapp_server.py) - ensures contacts created in WA with phone tied to user_id via DB updates.
export async function createWhatsAppContact(firstName: string, lastName: string, phoneNumber: string): Promise<{ success: boolean; action?: string; message?: string; error?: string }> {
  try {
    const sid = getAdminSessionId();
    const result = await pythonApiRequest<any>('/contact/create', 'POST', {
      session_id: sid,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber
    });
    // If created with phone, the open-or-create path or caller should have updated, but ensure here too for direct create.
    if (result.success && phoneNumber) {
      const fullName = `${firstName} ${lastName}`.trim();
      try { await updateUserWhatsAppContactName(phoneNumber, fullName); } catch {}
    }
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function openOrCreateWhatsAppContact(contactName: string, phoneNumber?: string): Promise<{ success: boolean; action?: string; existingContactName?: string; error?: string }> {
  return ensureContactExists(contactName, phoneNumber);
}

export async function checkWhatsAppContactExists(contactName: string): Promise<{ exists: boolean; contact_name: string; error?: string }> {
  try {
    const sid = getAdminSessionId();
    // Note: the py route is POST /contact/check but accepts query params (FastAPI)
    const result = await pythonApiRequest<any>(`/contact/check?session_id=${encodeURIComponent(sid)}&contact_name=${encodeURIComponent(contactName)}`, 'POST');
    return { exists: !!result.exists, contact_name: result.contact_name || contactName, error: result.error };
  } catch (error: any) {
    return { exists: false, contact_name: contactName, error: error.message };
  }
}

export async function getPollStatus(contact: string, question?: string): Promise<{ success: boolean; status?: any; error?: string }> {
  try {
    const sid = getAdminSessionId();
    const result = await getPythonWhatsAppClient().pollStatus({ session_id: sid, contact, question });
    return { success: !!result.success, status: result, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function parsePollResults(contact: string, question?: string): Promise<{ success: boolean; options?: any[]; total_votes?: number; error?: string }> {
  try {
    const sid = getAdminSessionId();
    const reqBody = { session_id: sid, contact, question };
    console.log('[WA Poll Route] POST /poll/parse-results (or /results) req:', JSON.stringify({ contact, q: (question||'').slice(0,60) }));
    const result = await pythonApiRequest<{ success: boolean; options?: any[]; total_votes?: number; error?: string }>(
      '/poll/parse-results',
      'POST',
      reqBody
    );
    console.log('[WA Poll Route] POST /poll/parse-results resp:', JSON.stringify({ success: result.success, opts: result.options?.length, err: result.error }));
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPythonHealth(): Promise<{ success: boolean; health?: any; error?: string }> {
  try {
    const result = await pythonApiRequest<any>('/health', 'GET', undefined, { skipEnsure: true });
    return { success: true, health: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listPythonSessions(): Promise<{ success: boolean; sessions?: any[]; error?: string }> {
  try {
    const result = await pythonApiRequest<any>('/sessions', 'GET', undefined, { skipEnsure: true });
    return { success: true, sessions: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function validateSession(): Promise<{ success: boolean; valid?: boolean; reason?: string; needs_reauth?: boolean; error?: string }> {
  try {
    const sid = getAdminSessionId();
    const result = await getPythonWhatsAppClient().validateSession(sid);
    return { ...result, success: result.success !== false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Re-export the internal screenshot helpers (already using correct sid)
export { takeWhatsAppScreenshot, listWhatsAppScreenshots };

// Export all session management functions

export async function sendDailyHabitMessages(
  options?: WAAutomationOptions & { skipEnsure?: boolean }
): Promise<{ sent: number; failed: number; skippedMarked?: number; skippedAlreadySent?: number; message?: string }> {
  // DB claim-first for daily messages (same as polls): check MessageLog non-terminal first; for pre create 'scheduled' record as 1st action before setTimeout;
  // inside timer: re-claim by exact _id still 'scheduled' before send. Prevents dups on repeated procedure. Cleanup prunes after 24h processed / next-day pending.
  const skipEnsure = options?.skipEnsure || false;
  try {
    await connectDB();

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id username whatsappNumber whatsappNumberEncrypted whatsappNumberHash whatsappSendTime whatsappContactName whatsappTypingDelay').lean();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const today = now.toISOString().split('T')[0];

    let sent = 0;
    let failed = 0;
    let skippedMarked = 0;
    let skippedAlreadySent = 0;

    for (const user of users) {
      const userDoc = user as any;
      const phoneNumber = userPhone(userDoc);
      if (!phoneNumber) continue;

      // Support any HH:MM with lead time for pre-hit (so WA server processing delivers sharp at user time)
      const userTimeStr = userDoc.whatsappSendTime || '20:00';
      const [uh, um] = userTimeStr.split(':').map((n: string) => parseInt(n, 10));
      const userMins = (uh || 20) * 60 + (um || 0);
      const typingDelaySecs = userDoc.whatsappTypingDelay || 15;
      const isFirstCalibration = !userDoc.whatsappTypingDelay || userDoc.whatsappTypingDelay <= 15;
      // Dynamic lead: open window early enough for large measured delays; first time uses fixed
      let effectiveLead = SEND_LEAD_MINUTES;
      if (!isFirstCalibration && typingDelaySecs > 60) {
        effectiveLead = Math.max(effectiveLead, Math.ceil(typingDelaySecs / 60) + 2);
      }
      const windowStart = userMins - effectiveLead;
      const windowEnd = userMins + 2; // small grace after
      if (!options?.manual && (currentTimeMinutes < windowStart || currentTimeMinutes > windowEnd)) {
        continue;
      }

      // Prevent duplicate send or schedule for the day. Include 'pending' (legacy) + scheduled/sent to take-1st claim: any non-terminal means procedure already followed once.
      // For manual dashboard triggers, allow to force re-send (undo prior record effect) so requests actually get triggered.
      const alreadySentMsg = await MessageLog.findOne({
        userId: userDoc._id,
        type: 'summary',
        date: today,
        status: { $in: ['pending', 'scheduled', 'sent', 'delivered'] }
      }).lean();
      if (alreadySentMsg && !options?.manual) {
        skippedAlreadySent++;
        continue;
      }
      if (alreadySentMsg && options?.manual) {
        console.log(`[WA Daily] Manual dashboard trigger: allowing re-send despite existing ${(alreadySentMsg as any).status} record for user ${userDoc._id}`);
      }

      const habits = await Habit.find({
        userId: new mongoose.Types.ObjectId(userDoc._id),
        whatsappEnabled: true,
      }).lean();

      const todayHabits = habits.filter(isHabitScheduledForToday);

      if (todayHabits.length === 0) continue;

      // Smart skip: if user already marked ALL via web dashboard, no need to send WA prompt
      const completedCount = await DailyLog.countDocuments({
        userId: userDoc._id,
        date: today,
        habitId: { $in: todayHabits.map((h: any) => h._id) },
        completed: true,
      });
      if (completedCount >= todayHabits.length) {
        if (!options?.manual) {
          console.log(`[WhatsApp] Skipping daily summary for user ${userDoc.username || userDoc._id}: already fully marked (${completedCount}/${todayHabits.length}) via web at ${currentTimeMinutes} (scheduled ~${userTimeStr})`);
          skippedMarked++;
          continue;
        } else {
          console.log(`[WhatsApp] Manual dashboard: proceeding to send despite all marked via web (for testing trigger)`);
        }
      }

      const habitList = todayHabits
        .map((h: any, i: number) => `${i + 1}. ⬜ ${h.name}${h.category ? ` (${h.category})` : ''}`)
        .join('\n');

      const message = `*📝 Your Daily Tasks*\n\n${habitList}\n\n_Reply with the numbers of tasks you've completed! (e.g. "1, 3")_\n\n_Stay consistent!_`;

      // Use best contact name: stored WhatsApp contact > username > phone
      const contactName = await getBestContactName(phoneNumber, userDoc.username);

      // Ensure contact exists, create if not
      await ensureContactExists(contactName, phoneNumber, skipEnsure);
      await new Promise(resolve => setTimeout(resolve, 500));

      const targetDate = new Date(now);
      targetDate.setHours(uh, um, 0, 0);

      // First time: start the request (typing) at exact 12:10 so we can measure real duration.
      // Later: pre by the saved duration so the on-time send in WA lands at 12:10.
      const preDelayForThis = isFirstCalibration ? 0 : typingDelaySecs;
      const startTypingTime = targetDate.getTime() - preDelayForThis * 1000;
      const timeoutMs = startTypingTime - now.getTime();

      if (timeoutMs > 0 && !options?.manual) {
        // Create scheduled message log as a duplicate prevention lock
        const messageLog = await MessageLog.create({
          userId: userDoc._id,
          type: 'summary',
          status: 'scheduled',
          content: message,
          sentAt: new Date(startTypingTime),
          scheduledFor: new Date(startTypingTime),
          date: today,
        });

        console.log(`[WhatsApp] Scheduled API message for ${userDoc.username || userDoc._id} in ${Math.round(timeoutMs / 1000)}s (typing delay: ${typingDelaySecs}s)`);

        setTimeout(async () => {
          try {
            // Claim the scheduled slot: take 1st and complete it (if multiple timers somehow), prevent dups.
            const stillScheduled = await MessageLog.findOne({ _id: messageLog._id, status: 'scheduled' });
            if (!stillScheduled) {
              console.log(`[WhatsApp] Scheduled message slot for ${userDoc.username} already claimed or sent.`);
              return;
            }

            // Re-check: if user marked everything via web in the meantime, cancel sending
            const currentCompletedCount = await DailyLog.countDocuments({
              userId: userDoc._id,
              date: today,
              habitId: { $in: todayHabits.map((h: any) => h._id) },
              completed: true,
            });
            if (currentCompletedCount >= todayHabits.length) {
              console.log(`[WhatsApp] Smart-skipping scheduled message for ${userDoc.username}: completed tasks in the meantime.`);
              await MessageLog.findByIdAndUpdate(messageLog._id, {
                status: 'failed',
                error: 'Skipped: completed tasks before scheduled send time'
              });
              return;
            }

            const t0 = Date.now();
            const result = await sendWhatsAppMessage(phoneNumber, message, contactName);
            const elapsedSecs = Math.round((Date.now() - t0) / 1000);

            if (result.ok) {
              await MessageLog.findByIdAndUpdate(messageLog._id, {
                status: 'sent',
                messageId: result.messageId,
                sentAt: new Date()
              });

              // Calibrate and store typing/send delay in database
              await User.findByIdAndUpdate(userDoc._id, {
                whatsappTypingDelay: Math.max(5, elapsedSecs)
              });

              console.log(`[WhatsApp] Perfectly timed message sent to ${userDoc.username} in ${elapsedSecs}s (Target was ${userTimeStr})`);
            } else {
              await MessageLog.findByIdAndUpdate(messageLog._id, {
                status: 'failed',
                error: (result as any).error,
                sentAt: new Date()
              });
              console.error(`[WhatsApp] Failed to send perfectly timed message to ${userDoc.username}: ${(result as any).error}`);
            }
          } catch (e: any) {
            console.error(`[WhatsApp] Error in scheduled timeout execution for ${userDoc.username}:`, e);
          }
        }, timeoutMs);

        sent++;
      } else {
        // Send immediately because this operation was explicitly requested through the API.
        const messageLog = await MessageLog.create({
          userId: userDoc._id,
          type: 'summary',
          status: 'sent',
          content: message,
          sentAt: new Date(),
          date: today,
        });

        const t0 = Date.now();
        const result = await sendWhatsAppMessage(phoneNumber, message, contactName);
        const elapsedSecs = Math.round((Date.now() - t0) / 1000);

        if (result.ok) {
          await MessageLog.findByIdAndUpdate(messageLog._id, { status: 'sent', messageId: result.messageId });

          await User.findByIdAndUpdate(userDoc._id, {
            whatsappTypingDelay: Math.max(5, elapsedSecs)
          });

          console.log(`[WhatsApp] Immediately sent message to ${userDoc.username} in ${elapsedSecs}s`);
          sent++;
        } else {
          await MessageLog.findByIdAndUpdate(messageLog._id, { status: 'failed', error: (result as any).error });
          failed++;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const summary = `[WhatsApp Automation] Daily messages: ${sent} sent, ${failed} failed, ${skippedMarked} skipped (fully marked via web), ${skippedAlreadySent} already sent${options?.manual ? ' (manual)' : ''}`;
    console.log(summary);
    return {
      sent,
      failed,
      skippedMarked,
      skippedAlreadySent,
      message:
        sent + failed === 0 && !options?.manual
          ? 'No users in the current send window'
          : sent + failed === 0 && options?.manual
            ? 'No eligible users to message (already sent, no habits, or fully marked)'
            : undefined,
    };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Daily messages error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function processReminders(options?: { skipEnsure?: boolean }): Promise<{ sent: number; failed: number }> {
  const skipEnsure = options?.skipEnsure || false;
  try {
    await connectDB();

    const today = new Date().toISOString().split('T')[0];

    const pendingMessages = await MessageLog.find({
      status: 'sent',
      date: today,
      type: 'summary',
    }).lean();

    let sent = 0;
    let failed = 0;

    for (const message of pendingMessages) {
      const user = await User.findById(message.userId).select('_id username whatsappNumber whatsappNumberEncrypted whatsappNumberHash whatsappReminderCount whatsappContactName');
      const phoneNumber = userPhone(user);
      if (!user || !phoneNumber) continue;

      const reminderCount = await ReminderLog.countDocuments({
        userId: message.userId,
        messageLogId: message._id,
        status: { $in: ['sent', 'delivered'] },
      });

      const maxReminders = user.whatsappReminderCount || 3;
      if (reminderCount >= maxReminders) continue;

      const lastReminder = await ReminderLog.findOne({
        userId: message.userId,
        messageLogId: message._id,
        status: { $in: ['sent', 'delivered'] },
      }).sort({ createdAt: -1 });

      if (lastReminder) {
        const minutesSince = (Date.now() - lastReminder.createdAt.getTime()) / (1000 * 60);
        if (minutesSince < 10) continue;
      }

      const reminderMessage = `${getRandomItem(REMINDER_MESSAGES)}\n\n${message.content}\n\n_Please reply with the numbers of tasks you've completed._`;

      const reminderLog = await ReminderLog.create({
        userId: message.userId,
        messageLogId: message._id,
        reminderNumber: reminderCount + 1,
        status: 'pending',
        date: today,
      });

      const contactName = await getBestContactName(phoneNumber, user.username);
      await ensureContactExists(contactName, phoneNumber, skipEnsure); // via /contact/open-or-create route, user_id tied
      const result = await sendWhatsAppMessage(phoneNumber, reminderMessage, contactName);

      if (result.ok) {
        await ReminderLog.findByIdAndUpdate(reminderLog._id, { status: 'sent', sentAt: new Date() });
        sent++;
      } else {
        await ReminderLog.findByIdAndUpdate(reminderLog._id, { status: 'failed', error: (result as any).error });
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[WhatsApp Automation] Reminders: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Reminders error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function createPollForUser(userId: string, preClaimedPollId?: string, adminId?: string, force: boolean = false, skipEnsure: boolean = false): Promise<{ success: boolean; pollId?: string; error?: string }> {
  try {
    await connectDB();

    const user = await User.findById(userId);
    const phoneNumber = userPhone(user);
    if (!user || !phoneNumber || !user.whatsappVerified) {
      return { success: false, error: 'User WhatsApp not verified' };
    }

    const waHabits = await Habit.find({
      userId: new mongoose.Types.ObjectId(userId),
      whatsappEnabled: true,
    }).sort({ order: 1 }).lean();

    if (waHabits.length === 0) {
      return { success: false, error: 'No WhatsApp-enabled habits found' };
    }

    const options = waHabits.map((h: any) => h.name);
    const rawQuestion = getRandomItem(POLL_QUESTIONS);
    const now = new Date();
    // Use clean question (no time suffix) for better UX and reliable matching in WA bubbles.
    // The python /poll/status + /poll/results use optional question for exact/contains match or fallback to last poll bubble.
    const todayStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
    const question = `${rawQuestion} (${todayStr})`;
    const contactName = await getBestContactName(phoneNumber, user.username);
    const today = new Date().toISOString().split('T')[0];

    // "Take 1st and complete it": if a pre-claimed scheduled record id is provided (from pre-schedule path), claim exactly that one first.
    // This prevents duplicate sends when a caller explicitly repeats the same API action.
    let poll: any = null;
    if (preClaimedPollId) {
      poll = await WhatsAppPoll.findById(preClaimedPollId);
      if (poll && poll.status === 'scheduled') {
        poll.status = 'pending';
        poll.contactName = contactName;
        poll.question = question;
        poll.options = options.map((text: string) => ({ text, votes: 0, voters: [] }));
        poll.allowMultiple = true;
        if (adminId) poll.adminId = new mongoose.Types.ObjectId(adminId);
        await poll.save();
      } else if (poll) {
        // already moved out of scheduled (e.g. by another procedure run) -- treat as claimed by other, do not proceed to route
        if (['pending', 'sent', 'voted', 'completed'].includes(poll.status)) {
          return { success: false, error: 'Poll schedule slot already claimed/processed' };
        }
      }
    }

    if (!poll) {
      // Atomic claim: take the first (scheduled) and complete it. Prevents duplicates even if called twice from any path.
      poll = await WhatsAppPoll.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(userId),
          date: today,
          status: 'scheduled'
        },
        {
          $set: {
            status: 'pending',
            contactName,
            question,
            options: options.map((text: string) => ({ text, votes: 0, voters: [] })),
            allowMultiple: true,
            ...(adminId ? { adminId: new mongoose.Types.ObjectId(adminId) } : {}),
          }
        },
        { new: true }
      );
    }

    if (!poll) {
      // No scheduled to claim: check for any existing non-final (to prevent dup create if race or repeated procedure)
      // If force (from dashboard manual trigger), clear prior so we actually call the py route (undo blocking record at dashboard call time).
      const existingNonFinal = await WhatsAppPoll.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        date: today,
        status: { $in: ['sent', 'voted', 'completed', 'pending', 'scheduled'] },
      });
      if (existingNonFinal && !force) {
        return { success: false, error: 'Poll already sent or in progress today' };
      }
      if (existingNonFinal && force) {
        await WhatsAppPoll.deleteMany({
          userId: new mongoose.Types.ObjectId(userId),
          date: today,
          status: { $in: ['sent', 'voted', 'completed', 'pending', 'scheduled'] },
        });
        console.log(`[WA Poll] force=true (dashboard): cleared existing record(s) for ${userId} today to trigger request`);
      }
      poll = await WhatsAppPoll.create({
        userId: new mongoose.Types.ObjectId(userId),
        contactName,
        question,
        options: options.map((text: string) => ({ text, votes: 0, voters: [] })),
        allowMultiple: true,
        status: 'pending',
        date: today,
        ...(adminId ? { adminId: new mongoose.Types.ObjectId(adminId) } : {}),
      });
    }

    try {
      const reqBody = {
        session_id: getAdminSessionId(),
        contact: contactName,
        question,
        options,
        allow_multiple: true,
      };
      console.log('[WA Poll Route] POST /poll/create req:', JSON.stringify({ contact: contactName, question: question?.slice(0,80), optionsCount: options.length }));
      const result = await pythonApiRequest<{ success: boolean; error?: string; options?: any[]; question?: string }>(
        '/poll/create',
        'POST',
        reqBody,
        { skipEnsure }
      );
      console.log('[WA Poll Route] POST /poll/create resp:', JSON.stringify({ success: result.success, hasOptions: !!result.options, error: result.error }));

      if (result.success) {
        poll.status = 'sent';
        poll.sentAt = new Date();
        await poll.save();
        return { success: true, pollId: poll._id.toString() };
      } else {
        poll.status = 'failed';
        await poll.save();
        return { success: false, error: result.error || 'Failed to create poll' };
      }
    } catch (error: any) {
      poll.status = 'failed';
      await poll.save();
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPollResults(pollId: string): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    await connectDB();

    const poll = await WhatsAppPoll.findById(pollId);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }

    try {
      const reqBody = {
        session_id: getAdminSessionId(),
        contact: poll.contactName,
        question: poll.question || undefined,
      };
      console.log('[WA Poll Route] POST /poll/results req (for get):', JSON.stringify({ contact: poll.contactName, q: (poll.question||'').slice(0,60) }));
      const result = await pythonApiRequest<{
        success: boolean;
        options?: Array<{ text: string; votes: number }>;
        total_votes?: number;
        error?: string;
      }>('/poll/results', 'POST', reqBody);
      console.log('[WA Poll Route] POST /poll/results resp:', JSON.stringify({ success: result.success, options: result.options?.length, total: result.total_votes, error: result.error }));

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to get results' };
      }

      poll.options = poll.options.map((opt: any) => {
        const resultOption = result.options?.find((o: any) => o.text === opt.text);
        return { ...opt, votes: resultOption?.votes || 0 };
      });

      poll.totalVotes = result.total_votes || 0;
      poll.status = 'completed';
      poll.completedAt = new Date();

      if (poll.totalVotes > 0) {
        const today = new Date().toISOString().split('T')[0];

        for (const option of poll.options) {
          if (option.votes > 0) {
            const habit = await Habit.findOne({ userId: poll.userId, name: option.text });
            if (habit) {
              await DailyLog.findOneAndUpdate(
                { userId: poll.userId, habitId: habit._id, date: today },
                { completed: true, completedAt: new Date() },
                { upsert: true }
              );
              await Habit.findByIdAndUpdate(habit._id, { $inc: { streak: 1 }, lastCompletedDate: today });
            }
          }
        }
      }

      const totalHabits = await Habit.countDocuments({ userId: poll.userId });
      const completedHabits = poll.options.filter((o: any) => o.votes > 0).length;

      poll.results = {
        completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
        completedHabits,
        totalHabits,
      };

      await poll.save();

      return { success: true, results: poll };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Parse poll results using XPath-based parsing and update database
 * Uses the unified /poll/results endpoint
 */
export async function parseAndUpdatePollResults(userId: string, contactName: string, pollQuestion?: string): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    await connectDB();

    // Call Python server to parse poll results using XPath
    const result = await pythonApiRequest<{
      success: boolean;
      options?: Array<{ text: string; votes: number }>;
      total_votes?: number;
      question?: string;
      error?: string;
    }>('/poll/results', 'POST', {
      session_id: getAdminSessionId(),
      contact: contactName,
      // question is now optional - will use XPath-based parsing
      question: pollQuestion || undefined,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to parse poll results' };
    }

    const today = new Date().toISOString().split('T')[0];
    const parsedResults = result.options || [];

    // Update database with parsed results
    for (const item of parsedResults) {
      // Find the habit by name for this user
      const habit = await Habit.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        name: item.text
      });

      if (habit) {
        const isCompleted = item.votes === 1;

        if (isCompleted) {
          // Update DailyLog as completed
          await DailyLog.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId), habitId: habit._id, date: today },
            { completed: true, completedAt: new Date() },
            { upsert: true }
          );

          // Increment streak for completed habits
          await Habit.findByIdAndUpdate(habit._id, {
            $inc: { streak: 1 },
            lastCompletedDate: today
          });
        } else {
          // Mark as not completed (or leave as is if previously completed)
          await DailyLog.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId), habitId: habit._id, date: today },
            { completed: false },
            { upsert: true }
          );

          // Reset streak for incomplete habits
          await Habit.findByIdAndUpdate(habit._id, {
            streak: 0,
            lastCompletedDate: null
          });
        }
      }
    }

    // Calculate totals
    const completedHabits = parsedResults.filter((r: any) => r.votes === 1).length;
    const totalHabits = parsedResults.length;

    // Save poll to database
    const poll = await WhatsAppPoll.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        date: today,
        status: { $in: ['sent', 'voted'] }
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          totalVotes: result.total_votes || completedHabits,
          options: parsedResults.map((r: any) => ({
            text: r.text,
            votes: r.votes,
            voters: []
          })),
          results: {
            completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
            completedHabits,
            totalHabits,
          }
        }
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      results: {
        pollId: poll._id.toString(),
        totalCompleted: completedHabits,
        totalHabits,
        completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
        habits: parsedResults
      }
    };
  } catch (error: any) {
    console.error('[WhatsApp Manager] Parse and update poll results error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPollConfirmation(userId: string, pollId: string, skipEnsure: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const poll = await WhatsAppPoll.findById(pollId);
    const user = await User.findById(userId);
    const phoneNumber = userPhone(user);

    if (!poll || !user || !phoneNumber) {
      return { success: false, error: 'User or poll not found' };
    }

    let message = `✅ *Poll Completed!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (poll.results) {
      message += `📊 *Results:*\n`;
      message += `• Completed: ${poll.results.completedHabits}/${poll.results.totalHabits}\n`;
      message += `• Rate: ${poll.results.completionRate}%\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━\n\n_Thank you for tracking your tasks!_`;

    const contactName = await getBestContactName(phoneNumber, user.username);
    await ensureContactExists(contactName, phoneNumber, skipEnsure);
    const result = await sendWhatsAppMessage(phoneNumber, message, contactName);
    return { success: result.ok, error: result.ok ? undefined : (result as any).error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processAllUserPolls(
  options?: WAAutomationOptions & { skipEnsure?: boolean }
): Promise<{ sent: number; failed: number; skippedMarked?: number; message?: string }> {
  // DB claim-first procedure (per "take 1st and complete it"):
  // 1. At decision time (in window), check DB for any existing non-terminal (scheduled/pending/sent..) for user+today -> skip entirely (no dup even if proc followed again).
  // 2. For pre-lead: create 'scheduled' record FIRST (store in DB), THEN setTimeout. The created record is the lock.
  // 3. Timer fires -> calls createPollForUser(..., claimedId) which "takes" the exact record (set pending) BEFORE any /poll/create py route.
  // 4. createPollForUser always claims (findAndUpdate scheduled->pending by id or search, else check nonfinal else create pending) then route.
  // Result: if one also follows the proc (tick/restart), sees claim, doesn't call route twice, no duplications.
  // Cleanup (24h processed gone; pending/sch removed by next day) keeps DB clean.
  try {
    await connectDB();
    const skipEnsure = options?.skipEnsure || false;

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id whatsappSendTime pollSchedule whatsappTypingDelay username whatsappNumber whatsappNumberEncrypted whatsappNumberHash whatsappContactName').lean();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const today = now.toISOString().split('T')[0];

    let sent = 0;
    let failed = 0;
    let skippedMarked = 0;

    for (const user of users as any[]) {
      const phoneNumber = userPhone(user);
      if (!phoneNumber) continue;
      const ps = user.pollSchedule || { enabled: true, frequency: 'daily', customDays: [], time: user.whatsappSendTime || '20:00' };
      if (ps.enabled === false) {
        continue;
      }

      // respect poll frequency / custom days for today
      const dow = now.getDay();
      let isScheduledToday = true;
      if (ps.frequency === 'weekdays') isScheduledToday = dow >= 1 && dow <= 5;
      else if (ps.frequency === 'weekends') isScheduledToday = dow === 0 || dow === 6;
      else if (ps.frequency === 'custom' && Array.isArray(ps.customDays) && ps.customDays.length > 0) {
        isScheduledToday = ps.customDays.includes(dow);
      }
      if (!isScheduledToday) {
        continue;
      }

      const userScheduledTime = ps.time || user.whatsappSendTime || '20:00';
      const [scheduledHour, scheduledMinute] = userScheduledTime.split(':').map(Number);
      const scheduledTimeMinutes = scheduledHour * 60 + scheduledMinute;

      // Trigger within lead window so poll arrives sharp at user time (pre-hit 2-3min before for typing/delay)
      // Only in narrow window (like daily messages), not all day after lead opens.
      const lead = SEND_LEAD_MINUTES;
      const windowStart = scheduledTimeMinutes - lead;
      const windowEnd = scheduledTimeMinutes + 2; // small grace
      if (!options?.manual && (currentTimeMinutes < windowStart || currentTimeMinutes > windowEnd)) {
        continue;
      }

      const existingPoll = await WhatsAppPoll.findOne({
        userId: user._id,
        date: today,
        status: { $in: ['sent', 'voted', 'completed', 'scheduled', 'pending'] },
      });

      if (existingPoll && !options?.manual) {
        continue;
      }
      if (existingPoll && options?.manual) {
        console.log(`[WA Poll] Manual dashboard trigger: allowing re-create despite existing ${existingPoll.status} record for user ${user._id}`);
      }

      // Smart skip for poll too: if user already fully marked habits via web, no need to send poll
      try {
        const userHabitsForPoll = await Habit.find({ userId: user._id, whatsappEnabled: true }).lean();
        const scheduledHabits = userHabitsForPoll.filter(isHabitScheduledForToday);
        if (scheduledHabits.length > 0) {
          const compCount = await DailyLog.countDocuments({
            userId: user._id,
            date: today,
            habitId: { $in: scheduledHabits.map((h: any) => h._id) },
            completed: true
          });
          if (compCount >= scheduledHabits.length) {
            if (!options?.manual) {
              console.log(`[WhatsApp] Skipping poll creation for ${user._id}: user already fully marked via dashboard`);
              skippedMarked++;
              continue;
            } else {
              console.log(`[WhatsApp] Manual dashboard: proceeding to poll despite all marked via web (to ensure request is triggered)`);
            }
          }
        }
      } catch (e) { /* non fatal */ }

      // === Precise pre-trigger logic for daily-habit-poll (and messages) ===
      // If user scheduled at 12:10:
      // - First time (no calibrated delay): send the request at ~12:10 exact (calibrate duration)
      // - Subsequent: use saved whatsappTypingDelay (e.g. 3min), trigger the route at 12:07/08 so typing starts,
      //   and the actual WA send completes "on time" at 12:10.
      // Scheduler (now 1min) + per-user window + setTimeout achieves this.
      const u = user as any;
      const contactName = await getBestContactName(phoneNumber, u.username);
      await ensureContactExists(contactName, phoneNumber, skipEnsure);
      const targetDate = new Date(now);
      targetDate.setHours(scheduledHour, scheduledMinute, 0, 0);
      const typingDelaySecs = u.whatsappTypingDelay || 15;
      const isFirstCalibration = !u.whatsappTypingDelay || u.whatsappTypingDelay <= 15;
      const preDelaySecs = isFirstCalibration ? 0 : typingDelaySecs; // first: start request at exact scheduled time
      const preFireTime = targetDate.getTime() - preDelaySecs * 1000;
      const timeoutMs = preFireTime - now.getTime();

      const schedKey = `${u._id}_${today}`;
      if (timeoutMs > 2000 && !options?.manual) {
        // Check if we already pre-scheduled (via DB or memory); if so skip to avoid duplicate timer.
        const alreadyPre = await WhatsAppPoll.findOne({ userId: u._id, date: today, status: 'scheduled' });
        if (alreadyPre || preScheduledPollKeys.has(schedKey)) {
          console.log(`[WA Poll] Skipping pre-schedule for ${contactName} (already scheduled)`);
        } else {
          // TAKE 1ST: create the DB scheduled claim record FIRST (before any timer or route).
          // Repeated API calls see this scheduled poll and skip duplicate route calls.
          const claimedScheduled = await WhatsAppPoll.create({
            userId: u._id,
            contactName,
            question: `Pre-scheduled at ${new Date().toISOString()}`, // will be overwritten on actual send/claim
            options: [],
            allowMultiple: true,
            status: 'scheduled',
            scheduledFor: new Date(preFireTime),
            date: today,
          });
          preScheduledPollKeys.add(schedKey);
          console.log(`[WA Scheduler] Pre-scheduling /poll/create route (typing start) for user ${u._id} @ ${userScheduledTime} in ${Math.round(timeoutMs/1000)}s (delay:${preDelaySecs}s, firstCal:${isFirstCalibration})`);
          setTimeout(async () => {
            try {
              const t0 = Date.now();
              // Pass the exact claimed id so createPollForUser "takes" precisely this record (status->pending) before calling the /poll/create route.
              const res = await createPollForUser(u._id.toString(), claimedScheduled._id.toString(), undefined, false, skipEnsure);
              const elapsed = Math.round((Date.now() - t0) / 1000);
              console.log(`[WA Poll] createPollForUser (from pre-timer) for contact=${contactName} user=${u._id} result:`, { success: res.success, error: res.error, elapsed });
              if (res.success) {
                // Calibrate / update delay from observed full op duration (for future pre-triggers)
                await User.findByIdAndUpdate(u._id, { whatsappTypingDelay: Math.max(5, elapsed) });
                console.log(`[WA] Poll route triggered at pre-time, completed in ${elapsed}s for user ${u._id} (target ${userScheduledTime})`);
              }
            } catch (e: any) {
              console.error('[WA pre-poll timer] error', e);
            } finally {
              preScheduledPollKeys.delete(schedKey);
            }
          }, timeoutMs);
        }
      } else if (!preScheduledPollKeys.has(schedKey)) {
        // Immediate: first calibration (at exact ~12:10), or late, or manual. Only if no pre-timer is pending for this user/day.
        const t0 = Date.now();
        const result = await createPollForUser(u._id.toString(), undefined, undefined, false, skipEnsure);
        const elapsed = Math.round((Date.now() - t0) / 1000);
        console.log(`[WA Poll] createPollForUser for contact=${contactName} user=${u._id} immediate result:`, { success: result.success, error: result.error, elapsed });
        if (result.success) {
          sent++;
          // Always persist observed duration so subsequent days use accurate pre-trigger
          await User.findByIdAndUpdate(u._id, { whatsappTypingDelay: Math.max(5, elapsed) }).catch(()=>{});
        } else {
          failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // A pre-timer is already scheduled for the precise lead time; skip this tick to avoid duplicate sends.
        console.log(`[WA Poll] Skipping immediate create for ${contactName} because pre-timer pending (key=${schedKey})`);
      }
    }

    // Process any overdue 'scheduled' polls (ensures send happens after restart or if timer missed;
    // "take 1st and complete it" via atomic claim in createPollForUser prevents dups/no duplications)
    try {
      const overdueScheduledPolls = await WhatsAppPoll.find({
        status: 'scheduled',
        scheduledFor: { $lte: now },
        date: today
      }).lean();
      for (const spoll of overdueScheduledPolls) {
        console.log(`[WA Scheduler] Firing overdue pre-scheduled poll create for user ${spoll.userId} (scheduledFor ${spoll.scheduledFor})`);
        // Pass specific id to take exactly this record first.
        const res = await createPollForUser(spoll.userId.toString(), (spoll as any)._id?.toString?.(), undefined, false, skipEnsure);
        if (res.success) sent++; else failed++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      console.error('[WA Scheduler] Overdue poll processing error:', e);
    }

    return {
      sent,
      failed,
      skippedMarked,
      message:
        sent + failed === 0 && options?.manual
          ? 'No eligible users for polls (outside window, already sent, or fully marked)'
          : undefined,
    };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Process polls error:', error);
    return { sent: 0, failed: 0, skippedMarked: 0 };
  }
}

export async function checkPendingPolls(options?: { skipEnsure?: boolean }): Promise<{ completed: number; failed: number }> {
  const skipEnsure = options?.skipEnsure || false;
  try {
    await connectDB();

    const pendingPolls = await WhatsAppPoll.find({ status: 'sent' }).lean();

    let completed = 0;
    let failed = 0;

    for (const poll of pendingPolls) {
      // Use the unified /poll/results endpoint with XPath-based parsing
      try {
        const parseResult = await pythonApiRequest<{
          success: boolean;
          options?: Array<{ text: string; votes: number }>;
          total_votes?: number;
          error?: string;
        }>('/poll/results', 'POST', {
          session_id: getAdminSessionId(),
          contact: (poll as any).contactName,
          // question is now optional - will use XPath-based parsing
          question: (poll as any).question || undefined,
        }, { skipEnsure });

        if (parseResult.success && parseResult.options) {
          // Update poll in database with parsed results
          const today = new Date().toISOString().split('T')[0];

          for (const item of parseResult.options) {
            const isCompleted = item.votes === 1;

            // Find habit by name and update
            const habit = await Habit.findOne({
              userId: (poll as any).userId,
              name: item.text
            });

            if (habit) {
              if (isCompleted) {
                await DailyLog.findOneAndUpdate(
                  { userId: (poll as any).userId, habitId: habit._id, date: today },
                  { completed: true, completedAt: new Date() },
                  { upsert: true }
                );
                await Habit.findByIdAndUpdate(habit._id, {
                  $inc: { streak: 1 },
                  lastCompletedDate: today
                });
              }
            }
          }

          // Calculate totals
          const completedHabits = parseResult.options.filter((o: any) => o.votes === 1).length;
          const totalHabits = parseResult.options.length;

          // Update poll status
          await WhatsAppPoll.findByIdAndUpdate((poll as any)._id, {
            status: 'completed',
            completedAt: new Date(),
            totalVotes: parseResult.total_votes || completedHabits,
            options: parseResult.options.map((r: any) => ({
              text: r.text,
              votes: r.votes,
              voters: []
            })),
            results: {
              completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
              completedHabits,
              totalHabits,
            }
          });

          completed++;
          await sendPollConfirmation((poll as any).userId.toString(), (poll as any)._id.toString());
        } else {
          failed++;
        }
      } catch (parseError: any) {
        console.error(`[Check Pending Polls] Parse error for poll ${(poll as any)._id}:`, parseError);

        // Fallback to old method
        const result = await getPollResults((poll as any)._id.toString());
        if (result.success) {
          completed++;
          await sendPollConfirmation((poll as any).userId.toString(), (poll as any)._id.toString());
        } else {
          failed++;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { completed, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Check polls error:', error);
    return { completed: 0, failed: 0 };
  }
}

function getRandomReminderMessage(): string {
  return POLL_REMINDER_MESSAGES[Math.floor(Math.random() * POLL_REMINDER_MESSAGES.length)];
}

export async function processPollReminders(): Promise<{ sent: number; skipped: number }> {
  try {
    await connectDB();

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id whatsappNumber whatsappContactName pollSchedule').lean();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let sent = 0;
    let skipped = 0;

    for (const user of users as any[]) {
      const pollSchedule = user.pollSchedule || {};
      if (!pollSchedule.enabled || !pollSchedule.reminderEnabled) {
        continue;
      }

      const reminderIntervals = pollSchedule.reminderIntervals || [5, 10, 20, 30];
      const scheduledTime = pollSchedule.time || '20:00';
      const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number);
      const scheduledMinutes = scheduledHour * 60 + scheduledMinute;

      const pollsSentToday = await WhatsAppPoll.find({
        userId: user._id,
        date: today,
        status: { $in: ['sent', 'voted', 'completed'] },
      }).sort({ sentAt: -1 }).limit(1).lean();

      if (pollsSentToday.length === 0) {
        continue;
      }

      const latestPoll = pollsSentToday[0] as any;
      if (!latestPoll.sentAt) {
        continue;
      }

      if (latestPoll.status === 'voted' || latestPoll.status === 'completed') {
        continue;
      }

      const pollSentTime = new Date(latestPoll.sentAt);
      const minutesSincePoll = Math.floor((now.getTime() - pollSentTime.getTime()) / 60000);

      for (const interval of reminderIntervals) {
        if (minutesSincePoll < interval) {
          continue;
        }

        const reminderKey = `poll_reminder_${latestPoll._id}_${interval}`;
        const existingReminder = await MessageLog.findOne({
          userId: user._id,
          content: { $regex: new RegExp(`^${reminderKey}`) },
          date: today,
          type: 'poll_reminder',
        });

        if (existingReminder) {
          continue;
        }

        const reminderMessage = getRandomReminderMessage();
        const contactName = user.whatsappContactName || 'User';

        try {
          await pythonApiRequest('/message/send', 'POST', {
            session_id: getAdminSessionId(),
            phone: user.whatsappNumber,
            message: `${reminderKey}|${reminderMessage}`,
          });

          await MessageLog.create({
            userId: user._id,
            type: 'poll_reminder',
            status: 'sent',
            content: `${reminderKey}|${reminderMessage}`,
            sentAt: new Date(),
            date: today,
          });

          sent++;
          console.log(`[Poll Reminder] Sent reminder to ${contactName} at ${interval} minutes`);
        } catch (error) {
          console.error(`[Poll Reminder] Failed to send reminder:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      skipped++;
    }

    return { sent, skipped };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Poll reminders error:', error);
    return { sent: 0, skipped: 0 };
  }
}

/**
 * Advanced poll status based checks & reminders (per requirements):
 * - ~15min after poll send: check status (up to 3 times)
 * - if 'sent' only: check then leave (no spam)
 * - if 'delivered': send gentle reminder 15m later
 * - if 'read': immediately get_poll_results, mark DB, send confirmation
 * Uses integrated getPollStatus + getPollResults + message status concepts.
 */
export async function processAdvancedPollStatusChecks(): Promise<{ checks: number; reminders: number; resultsFetched: number; marked: number }> {
  try {
    await connectDB();
    const today = new Date().toISOString().split('T')[0];

    const activePolls = await WhatsAppPoll.find({
      status: 'sent',
      date: today,
    }).limit(300).lean() as any[];

    let checks = 0;
    let reminders = 0;
    let resultsFetched = 0;
    let marked = 0;

    for (const poll of activePolls) {
      const checksDone = poll.statusCheckCount || 0;
      if (checksDone >= 3) continue;

      const sentAt = poll.sentAt || poll.createdAt;
      if (!sentAt) continue;
      const minsSince = (Date.now() - new Date(sentAt).getTime()) / (1000 * 60);
      if (minsSince < 14) continue; // first check ~15min

      try {
        // Prefer poll/status for poll bubbles (returns message status)
        const statRes = await getPollStatus(poll.contactName, poll.question);
        checks++;

        // Robust parse of response JSON from /poll/status route (py returns {success, status: 'Read'|'Delivered'|'Sent', ...} or similar)
        // getPollStatus wrapper returns {success, status: <py response>, ...}
        const pyResp = (statRes as any)?.status || statRes || {};
        let rawStatus = 'unknown';
        if (pyResp && typeof pyResp === 'object') {
          rawStatus = pyResp.status || pyResp.message_status || pyResp.state || 'unknown';
        } else {
          rawStatus = String(pyResp || 'unknown');
        }
        const waStat = String(rawStatus).toLowerCase().trim();

        await WhatsAppPoll.findByIdAndUpdate(poll._id, {
          $set: { lastStatusCheckAt: new Date(), lastMessageStatus: waStat },
          $inc: { statusCheckCount: 1 }
        });

        const isRead = waStat.includes('read') || waStat.includes('open') || waStat.includes('play') || waStat === 'read';
        const isDelivered = waStat.includes('deliver') || waStat.includes('recv') || waStat.includes('device');

        if (isRead) {
          const got = await getPollResults(poll._id.toString());
          if (got && got.success) {
            resultsFetched++;
            try { await sendPollConfirmation(poll.userId.toString(), poll._id.toString()); } catch {}
            marked++;
          }
        } else if (isDelivered) {
          // gentle reminder if not sent recently
          const recent = await MessageLog.findOne({
            userId: poll.userId,
            date: today,
            type: 'poll_reminder',
            createdAt: { $gte: new Date(Date.now() - 14 * 60 * 1000) }
          }).lean();
          if (!recent) {
            const gentle = "📌 *Gentle reminder:* Please vote on today's habit poll if not done. Your progress & streaks are waiting!";
            await pythonApiRequest('/message/send', 'POST', {
              session_id: getAdminSessionId(),
              contact: poll.contactName,
              message: gentle,
            });
            await MessageLog.create({
              userId: poll.userId,
              type: 'poll_reminder',
              status: 'sent',
              content: gentle,
              sentAt: new Date(),
              date: today,
            });
            reminders++;
          }
        }
        // 'sent' or other: just recorded the check (up to 3)
      } catch (chkErr) {
        console.error('[WA Poll Status] check error for', poll._id, chkErr);
      }

      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    console.log(`[WA Poll Status] checks:${checks} gentleReminders:${reminders} resultsFetched:${resultsFetched} newlyMarked:${marked}`);
    return { checks, reminders, resultsFetched, marked };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Advanced poll status checks error:', error);
    return { checks: 0, reminders: 0, resultsFetched: 0, marked: 0 };
  }
}

export async function generateWeeklyReport(userId: string, skipEnsure: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const user = await User.findById(userId).select(
      'username whatsappNumber whatsappNumberEncrypted whatsappNumberHash whatsappVerified whatsappContactName sharedContacts'
    );
    const ownerPhone = userPhone(user);
    if (!user || !user.whatsappVerified || !ownerPhone) return { success: false, error: 'User not verified' };

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const dailyLogs = await DailyLog.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekStartStr, $lte: weekEndStr },
      completed: true,
    }).lean();

    const habits = await Habit.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    const totalHabits = habits.length;
    const completedHabitsCount = dailyLogs.length; // total log entries
    const completionRate = totalHabits > 0 ? Math.round((completedHabitsCount / (totalHabits * 7)) * 100) : 0;

    const messagesSent = await MessageLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekStartStr, $lte: weekEndStr },
      status: 'sent',
    });

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekLogs = await DailyLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: previousWeekStart.toISOString().split('T')[0], $lt: weekStartStr },
      completed: true,
    });

    const previousRate = totalHabits > 0 ? Math.round((previousWeekLogs / (totalHabits * 7)) * 100) : 0;
    const improvement = completionRate - previousRate;

    await WeeklyAnalytics.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), weekStartDate: weekStartStr },
      {
        userId: new mongoose.Types.ObjectId(userId),
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        totalHabits,
        completedHabits: completedHabitsCount,
        completionRate,
        totalMessagesSent: messagesSent,
        responseRate: 0,
        previousWeekCompletionRate: previousRate,
        improvementFromLastWeek: improvement,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Build descriptive per-habit report data (tied strictly to this userId's DailyLogs + Habits)
    const dayAbbrMap: { [key: number]: string } = {0:'sun',1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat'};
    const habitDetails: string[] = [];
    for (const h of habits) {
      const hIdStr = (h._id as any).toString();
      const hLogs = dailyLogs.filter((l: any) => l.habitId && l.habitId.toString() === hIdStr);
      const count = hLogs.length;
      const days = Array.from(new Set(hLogs.map((l: any) => {
        const dt = new Date(l.date + 'T00:00:00Z'); // normalize
        return dayAbbrMap[dt.getUTCDay()] || '';
      }).filter(Boolean))).sort((a,b) => ['sun','mon','tue','wed','thu','fri','sat'].indexOf(a) - ['sun','mon','tue','wed','thu','fri','sat'].indexOf(b) );
      const daysStr = days.length ? ` (${days.join('|')})` : '';
      habitDetails.push(`${h.name} - followed ${count}/7 days${daysStr}`);
    }

    const perHabitBlock = habitDetails.length > 0 ? habitDetails.join('\n') : 'No habits tracked this week.';

    const message = `📊 *Weekly Report*\n\n━━━━━━━━━━━━━━━━━━━━\n\n✅ *Completed:* ${completedHabitsCount}/${totalHabits * 7}\n📈 *Rate:* ${completionRate}%\n🔥 *Change:* ${improvement >= 0 ? '+' : ''}${improvement}%\n\nHabits:\n${perHabitBlock}\n\n━━━━━━━━━━━━━━━━━━━━\n\n_Keep improving!_`;

    const contactName = await getBestContactName(ownerPhone, user.username);
    await ensureContactExists(contactName, ownerPhone, skipEnsure);
    const result = await sendWhatsAppMessage(ownerPhone, message, contactName);

    const shares: any[] = (user as any).sharedContacts || [];
    for (const sc of shares) {
      if (!sc || !sc.enabledForReports) continue;
      const scName = sc.name || 'Contact';
      const scPhone = resolveSharedContactPhone(sc);
      if (!scPhone && !sc.name) continue;
      try {
        await ensureContactExists(scName, scPhone || undefined, skipEnsure);
        const shareMsg = `📊 *Weekly Report* (shared)\n\n${message}`;
        if (scPhone) await sendWhatsAppMessage(scPhone, shareMsg, scName);
        await new Promise(r => setTimeout(r, 1200));
      } catch (shareErr) {
        console.error('[Weekly] share send failed for', scName, shareErr);
      }
    }

    return { success: result.ok, error: result.ok ? undefined : (result as any).error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendWeeklyReports(options?: { skipEnsure?: boolean }): Promise<{ sent: number; failed: number }> {
  const skipEnsure = options?.skipEnsure || false;
  try {
    await connectDB();

    const users = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappNumber: { $exists: true, $ne: '' },
    }).select('_id sharedContacts').lean();

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const result = await generateWeeklyReport((user as any)._id.toString(), skipEnsure);
      if (result.success) sent++;
      else failed++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { sent, failed };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Weekly reports error:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function sendInactivityAlert(userId: string, daysInactive: number, skipEnsure: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB();

    const user = await User.findById(userId).select('username whatsappNumber whatsappNumberEncrypted whatsappNumberHash whatsappVerified whatsappContactName');
    const phoneNumber = userPhone(user);
    if (!user || !phoneNumber || !user.whatsappVerified) {
      return { success: false, error: 'User not verified' };
    }

    const message = `😔 *We miss you!*\n\nYou haven't used the app for ${daysInactive} days.\n\nYour habits are waiting! Come back and track your progress.\n\n_Start today!_`;

    const contactName = await getBestContactName(phoneNumber, user.username);
    // Ensure the contact is created/opened in WA (via /contact/open-or-create route) so send by name succeeds. Tied to this userId's data.
    await ensureContactExists(contactName, phoneNumber, skipEnsure);
    const result = await sendWhatsAppMessage(phoneNumber, message, contactName);
    return { success: result.ok, error: result.ok ? undefined : (result as any).error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkInactivity(options?: { skipEnsure?: boolean }): Promise<{ alertsSent: number }> {
  const skipEnsure = options?.skipEnsure || false;
  try {
    await connectDB();

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const inactiveUsers = await User.find({
      whatsappVerified: true,
      whatsappAutomation: true,
      $or: [
        { lastActive: { $lt: threeDaysAgo } },
        { lastActive: { $exists: false } },
      ],
    }).select('_id').lean();

    let alertsSent = 0;
    for (const user of inactiveUsers) {
      const result = await sendInactivityAlert((user as any)._id.toString(), 3, skipEnsure);
      if (result.success) alertsSent++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { alertsSent };
  } catch (error: any) {
    console.error('[WhatsApp Automation] Inactivity check error:', error);
    return { alertsSent: 0 };
  }
}

export default {
  sendDailyHabitMessages,
  processReminders,
  createPollForUser,
  getPollResults,
  parseAndUpdatePollResults,
  sendPollConfirmation,
  processAllUserPolls,
  checkPendingPolls,
  processAdvancedPollStatusChecks,
  generateWeeklyReport,
  sendWeeklyReports,
  sendInactivityAlert,
  checkInactivity,
  getAdminSessionId,
  ensureWhatsAppReady,
  checkMessageStatus,
  getPollStatus,
  parsePollResults,
  getPythonHealth,
  listPythonSessions,
  validateSession,
  takeWhatsAppScreenshot,
  listWhatsAppScreenshots,
  saveWhatsAppSession,
  loadWhatsAppSession,
  setDbSession,
  // Contact routes fully integrated
  createWhatsAppContact,
  openOrCreateWhatsAppContact,
  checkWhatsAppContactExists,
  // Idempotent DB claim and cleanup for explicit API calls.
  cleanupOldWARecords,
};
