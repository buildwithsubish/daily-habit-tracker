import WhatsAppSession from './models/WhatsAppSession';
import connectDB from './mongodb';

export type WhatsAppProvider = 'whatsapp-web' | 'twilio' | 'meta';

export type WhatsAppSendResult =
  | { ok: true; provider: WhatsAppProvider; messageId?: string }
  | { ok: false; provider: WhatsAppProvider; error: string; status?: number };

function getProvider(): WhatsAppProvider {
  const p = (process.env.WHATSAPP_PROVIDER || 'whatsapp-web').toLowerCase();
  if (p === 'whatsapp-web' || p === 'whatsapp') return 'whatsapp-web';
  if (p === 'meta') return 'meta';
  return 'twilio';
}

async function getWhatsAppWebClient() {
  const { default: whatsappClientManager } = await import('./whatsapp-web');
  return whatsappClientManager;
}

async function sendViaWhatsAppWeb(to: string, body: string, contactName?: string): Promise<WhatsAppSendResult> {
  try {
    await connectDB();
    
    // First try to find by ADMIN_SESSION_ID directly
    let activeSession = await WhatsAppSession.findOne({ 
      ADMIN_SESSION_ID: { $exists: true, $ne: null },
      status: 'connected' 
    }).sort({ lastConnectedAt: -1 });
    
    // If not found, try by adminId
    if (!activeSession) {
      activeSession = await WhatsAppSession.findOne({ status: 'connected' }).sort({ lastConnectedAt: -1});
    }
    
    // If still not found, try any session regardless of status
    if (!activeSession) {
      activeSession = await WhatsAppSession.findOne().sort({ lastConnectedAt: -1 });
    }
    
    if (!activeSession) {
      const error = 'No WhatsApp Web session found. Please ask admin to connect WhatsApp at /admin/whatsapp';
      console.error(`[WhatsApp/Web] ${error}`);
      return { ok: false, provider: 'whatsapp-web', error };
    }

    // Check if session is connected
    if (activeSession.status !== 'connected') {
      const error = `WhatsApp session is ${activeSession.status}. Please reconnect at /admin/whatsapp`;
      console.error(`[WhatsApp/Web] ${error}`);
      return { ok: false, provider: 'whatsapp-web', error };
    }

    // Use ADMIN_SESSION_ID if available, otherwise fall back to adminId
    const adminId = activeSession.ADMIN_SESSION_ID || activeSession.adminIdString || activeSession.adminId?.toString();
    const clientManager = await getWhatsAppWebClient();
    
    console.log(`[WhatsApp/Web] Sending message to ${to} using session ${adminId}`);
    const result = await clientManager.sendMessage(adminId!, to, body, contactName);
    
    if (result.success) {
      console.log(`[WhatsApp/Web] Message sent successfully to ${contactName || to}`);
      return { ok: true, provider: 'whatsapp-web', messageId: result.messageId };
    } else {
      console.error(`[WhatsApp/Web] Send failed: ${result.error}`);
      return { ok: false, provider: 'whatsapp-web', error: result.error || 'Failed to send message' };
    }
  } catch (error: any) {
    const errMsg = error.message || 'Unknown send error';
    console.error(`[WhatsApp/Web] Exception: ${errMsg}`);
    return { ok: false, provider: 'whatsapp-web', error: errMsg };
  }
}

const ENCOURAGEMENTS = [
  "Stay consistent — every small step counts. 🔥",
  "You're doing great! Keep building those habits. 💪",
  "One day at a time. Proud of you! 🌟",
  "Consistency is the key to mastery. Keep it up! 🎯",
  "Remember why you started. You've got this! ✨",
  "Small wins compound into massive success. 🚀",
];

export function getAppreciativeMessage() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

export function formatHabitListMessage(habits: Array<{ name: string; category?: string; id?: string }>) {
  if (habits.length === 0) return "You have no habits scheduled for today! Enjoy your day.";

  const habitList = habits
    .map((h, i) => `${i + 1}. ⬜ ${h.name}${h.category ? ` (${h.category})` : ''}`)
    .join('\n');

  return `*📝 Your Daily Rituals*\n\n${habitList}\n\n_Reply with the numbers of the habits you've completed! (e.g. "1, 3")_\n${getAppreciativeMessage()}`;
}

async function sendViaTwilio(to: string, body: string): Promise<WhatsAppSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !auth || !from) {
    const error = 'Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER';
    console.error(`[WhatsApp/Twilio] ${error}`);
    return { ok: false, provider: 'twilio', error };
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const formData = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${to}`,
    Body: body,
  });

  try {
    console.log(`[WhatsApp/Twilio] Sending message to ${to}...`);
    
    const resp = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!resp.ok) {
      let msg = 'Twilio send failed';
      try {
        const data = await resp.json();
        msg = data?.message || msg;
      } catch { }
      
      console.error(`[WhatsApp/Twilio] Send failed with status ${resp.status}: ${msg}`);
      return { ok: false, provider: 'twilio', error: msg, status: resp.status };
    }

    const data = await resp.json();
    const messageId = data?.sid;
    
    console.log(`[WhatsApp/Twilio] Message sent successfully (ID: ${messageId})`);
    return { ok: true, provider: 'twilio', messageId };
  } catch (error: any) {
    const errMsg = error.message || 'Unknown send error';
    console.error(`[WhatsApp/Twilio] Exception: ${errMsg}`);
    return { ok: false, provider: 'twilio', error: errMsg };
  }
}

async function sendViaMeta(): Promise<WhatsAppSendResult> {
  // Implementing Meta WhatsApp Business Cloud API requires:
  // - WHATSAPP_META_ACCESS_TOKEN
  // - WHATSAPP_META_PHONE_NUMBER_ID
  // - templates / opt-in compliance, etc.
  const error = 'Meta provider not configured. Set WHATSAPP_PROVIDER=meta and implement Meta Cloud API credentials.';
  console.warn(`[WhatsApp/Meta] ${error}`);
  return { ok: false, provider: 'meta', error };
}

export async function sendWhatsAppMessage(to: string, body: string, contactName?: string): Promise<WhatsAppSendResult> {
  if (!to || !to.trim()) {
    const error = 'Invalid phone number: empty or null';
    console.error(`[WhatsApp] ${error}`);
    return { ok: false, provider: 'whatsapp-web', error };
  }

  if (!body || !body.trim()) {
    const error = 'Invalid message body: empty or null';
    console.error(`[WhatsApp] ${error}`);
    return { ok: false, provider: 'whatsapp-web', error };
  }

  const provider = getProvider();
  console.log(`[WhatsApp] Using provider: ${provider}`);
  
  if (provider === 'whatsapp-web') return await sendViaWhatsAppWeb(to, body, contactName);
  if (provider === 'meta') return await sendViaMeta();
  return await sendViaTwilio(to, body);
}

export interface DashboardSummaryData {
  username: string;
  habits: Array<{ name: string; category?: string; completed?: boolean }>;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  consistencyRate: number;
  weeklyTrend: number; // percentage change
  totalHabitsToday: number;
  completedToday: number;
}

export function formatDashboardSummary(data: DashboardSummaryData): string {
  const greeting = getTimeGreeting();
  const tip = getAppreciativeMessage();

  // Header
  let msg = `${greeting}, *${data.username || 'Champion'}*! 🌟\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *Your Daily Dashboard*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Today's stats
  msg += `✅ *Completed:* ${data.completedToday}/${data.totalHabitsToday} habits\n`;
  msg += `📈 *Completion Rate:* ${data.completionRate}%\n`;
  msg += `🔥 *Current Streak:* ${data.currentStreak} days\n`;
  msg += `🏆 *Longest Streak:* ${data.longestStreak} days\n`;
  msg += `📅 *Consistency:* ${data.consistencyRate}%\n`;

  // Weekly trend
  if (data.weeklyTrend !== 0) {
    const arrow = data.weeklyTrend > 0 ? '↑' : '↓';
    const emoji = data.weeklyTrend > 0 ? '🚀' : '💪';
    msg += `${emoji} *Weekly Trend:* ${arrow} ${Math.abs(data.weeklyTrend)}%\n`;
  }

  msg += `\n`;

  // Habits checklist
  if (data.habits.length > 0) {
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📝 *Today's Rituals*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    data.habits.forEach((h, i) => {
      const status = h.completed ? '✅' : '⬜';
      const cat = h.category ? ` _(${h.category})_` : '';
      msg += `${i + 1}. ${status} ${h.name}${cat}\n`;
    });

    msg += `\n`;
  }

  // Motivational tip
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💡 *Daily Tip:* ${tip}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Reply instructions
  const incomplete = data.habits
    .map((h, i) => ({ index: i + 1, completed: h.completed }))
    .filter(h => !h.completed);

  if (incomplete.length > 0) {
    msg += `_Reply with the numbers of habits you've completed (e.g. "${incomplete.slice(0, 2).map(h => h.index).join(', ')}")_`;
  } else {
    msg += `🎉 _All habits completed! Amazing work today!_`;
  }

  return msg;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
