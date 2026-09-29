import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Habit from '@/lib/models/Habit';
import WhatsAppPoll from '@/lib/models/WhatsAppPoll';
import DailyLog from '@/lib/models/DailyLog';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import { getAdminSessionId, createPollForUser as createPollForUserFromManager, processAllUserPolls as processAllUserPollsFromManager, getPollResults as getPollResultsFromManager, sendPollConfirmation as sendPollConfirmationFromManager, checkPendingPolls as checkPendingPollsFromManager } from './whatsapp-manager';

const POLL_QUESTIONS = [
  'What are the completed daily tasks?',
  'Which tasks did you complete today?',
  'Tell us about your completed tasks!',
  'What tasks did you accomplish today?',
  'Share your completed tasks for today!',
  'Did you complete your daily tasks?',
  'Which daily tasks are done?',
];

function getRandomQuestion(): string {
  return POLL_QUESTIONS[Math.floor(Math.random() * POLL_QUESTIONS.length)];
}

export async function createPollForUser(
  userId: string,
  adminId: string = getAdminSessionId(),
  force: boolean = false,
  skipEnsure: boolean = false
): Promise<{ success: boolean; pollId?: string; error?: string }> {
  // Delegate to the main implementation in whatsapp-manager.ts which does:
  // - full per-user habit/pollSchedule filtering
  // - DB "take 1st" claim-first for 'scheduled' (pre) or create 'pending'
  // - dedup of scheduled/pending/sent etc to guarantee no route called twice even on repeated procedure
  // - contact ensure, calibration, lead pre etc.
  // Passing adminId as the third arg, force as 4th, skipEnsure 5th for manual task paths.
  return createPollForUserFromManager(userId, undefined, adminId, force, skipEnsure);
}

export async function getPollResults(
  pollId: string,
  adminId: string = getAdminSessionId(),
  autoUpdateHabits: boolean = true
): Promise<{ success: boolean; results?: any; error?: string }> {
  // Delegate to manager version (handles status updates, DailyLog/Habit marking, results parsing via py route)
  return getPollResultsFromManager(pollId);
  // Note: autoUpdateHabits and adminId are handled inside the main impl; this keeps single source for results logic too.
}

export async function sendPollConfirmation(
  userId: string,
  pollId: string,
  adminId: string = 'default'
): Promise<{ success: boolean; error?: string }> {
  // Delegate (adminId unused in main impl as it uses internal session)
  return sendPollConfirmationFromManager(userId, pollId);
}

export async function processAllUserPolls(
  adminId: string = getAdminSessionId()
): Promise<{ sent: number; failed: number }> {
  // Delegate fully to manager's version: this one has the lead-time pre-trigger, DB claim-first 'scheduled' take-1st, per-user windows, no-dup checks, calibration.
  // Ensures that even if legacy path calls it, the same "store in DB first, don't call twice" procedure is followed.
  const res = await processAllUserPollsFromManager({ manual: false, skipEnsure: false });
  return { sent: res?.sent || 0, failed: res?.failed || 0 };
}

export async function checkAndCompletePolls(
  adminId: string = 'default'
): Promise<{ completed: number; failed: number }> {
  // Delegate to the manager's checkPendingPolls (which does advanced status + results via py + marks)
  const res = await checkPendingPollsFromManager();
  return { completed: res?.completed || 0, failed: res?.failed || 0 };
}
