import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { collectReportRecipientsFromUser } from '@/lib/pii';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export type TaskStats = {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  running: number;
};

export type ExecutionReportInput = {
  label: string;
  stats: TaskStats;
  executionTimeMs: number;
  errors?: string[];
  details?: string[];
};

export function formatExecutionReport(input: ExecutionReportInput): string {
  const { label, stats, executionTimeMs, errors = [], details = [] } = input;
  const lines = [
    '📋 *Execution Report*',
    '',
    `*Job:* ${label}`,
    `*Time:* ${new Date().toLocaleString()}`,
    '',
    `• Total tasks: ${stats.total}`,
    `• Completed: ${stats.completed}`,
    `• Failed: ${stats.failed}`,
    `• Skipped: ${stats.skipped}`,
    `• Running: ${stats.running}`,
    `• Success count: ${stats.completed}`,
    `• Failure count: ${stats.failed}`,
    `• Duration: ${(executionTimeMs / 1000).toFixed(1)}s`,
  ];
  if (details.length) {
    lines.push('', '*Details:*', ...details.slice(0, 15).map((d) => `• ${d}`));
  }
  if (errors.length) {
    lines.push('', '*Errors:*', ...errors.slice(0, 10).map((e) => `• ${e}`));
  }
  return lines.join('\n');
}

/** Recipients from MongoDB only — user phone + shared contacts with enabledForReports. */
async function collectReportRecipients(userId?: string | null) {
  if (!userId) return [];

  await connectDB();
  const user = await User.findById(userId).select(
    'whatsappNumber whatsappNumberEncrypted whatsappNumberHash whatsappVerified whatsappAutomation sharedContacts'
  ).lean();

  if (!user) return [];
  return collectReportRecipientsFromUser(user as any);
}

export async function sendExecutionReport(
  input: ExecutionReportInput,
  userId?: string | null
): Promise<{ sent: number; failed: number }> {
  const message = formatExecutionReport(input);
  const recipients = await collectReportRecipients(userId);

  if (!recipients.length) {
    console.warn('[Execution Report] No MongoDB recipients for user — skipping WhatsApp delivery');
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendWhatsAppMessage(recipient.phone, message, recipient.name);
      if (result.ok) sent++;
      else failed++;
      await new Promise((r) => setTimeout(r, 800));
    } catch {
      failed++;
    }
  }

  console.log(`[Execution Report] ${input.label}: sent=${sent} failed=${failed}`);
  return { sent, failed };
}

export class ExecutionTracker {
  private started = Date.now();
  private stats: TaskStats = { total: 0, completed: 0, failed: 0, skipped: 0, running: 0 };
  private errors: string[] = [];
  private details: string[] = [];
  private userId: string | null = null;

  constructor(private label: string, userId?: string | null) {
    this.userId = userId || null;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  record(partial: Partial<TaskStats> & { detail?: string; error?: string }) {
    if (partial.completed) this.stats.completed += partial.completed;
    if (partial.failed) this.stats.failed += partial.failed;
    if (partial.skipped) this.stats.skipped += partial.skipped;
    if (partial.running !== undefined) this.stats.running = partial.running;
    this.stats.total = this.stats.completed + this.stats.failed + this.stats.skipped + this.stats.running;
    if (partial.detail) this.details.push(partial.detail);
    if (partial.error) this.errors.push(partial.error);
  }

  async finish(sendWhatsApp: boolean = true): Promise<ExecutionReportInput> {
    this.stats.running = 0;
    this.stats.total = this.stats.completed + this.stats.failed + this.stats.skipped;
    const report: ExecutionReportInput = {
      label: this.label,
      stats: { ...this.stats },
      executionTimeMs: Date.now() - this.started,
      errors: [...this.errors],
      details: [...this.details],
    };
    if (sendWhatsApp && this.userId && (report.stats.completed > 0 || report.stats.failed > 0)) {
      await sendExecutionReport(report, this.userId).catch((e) =>
        console.error('[Execution Report] delivery failed:', e?.message)
      );
    }
    return report;
  }
}