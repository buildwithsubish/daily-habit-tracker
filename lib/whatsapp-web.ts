import connectDB from './mongodb';
import WhatsAppSession from './models/WhatsAppSession';
import AuditLog from './models/AuditLog';
import { getPythonWhatsAppClient } from './python-whatsapp-client';

interface WhatsAppClientInstance {
  sessionId: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  qrCode?: string;
  phoneNumber?: string;
  appLocked?: boolean;
}

class WhatsAppClientManager {
  private instances: Map<string, WhatsAppClientInstance> = new Map();
  private statusCallbacks: Map<string, (status: string, data?: any) => void> = new Map();
  private qrCallbacks: Map<string, (qr: string) => void> = new Map();
  // Per-session in-flight init promises to prevent concurrent /session/init calls (which can open browser twice)
  private initPromises: Map<string, Promise<void>> = new Map();

  private async apiRequest<T>(endpoint: string, method: string = 'GET', body?: unknown, timeoutMs: number = 30000): Promise<T | null> {
    try {
      return await getPythonWhatsAppClient().request<T>(endpoint, method, body, { timeoutMs });
    } catch (error) {
      console.error(`[WhatsApp API] Request to ${endpoint} failed:`, error);
      return null;
    }
  }

  async ensureReady(ADMIN_SESSION_ID: string, force: boolean = false): Promise<boolean> {
    // For manual admin actions, force fresh status check (bypass any throttle/cache) so real-time connected state is used.
    // Treat 'connecting' as ready (active) too - py server may accept sends during connect; avoids false "not connected" in task processor.
    const status = await this.getStatus(ADMIN_SESSION_ID, force);
    if (status.status === 'connected' || status.status === 'connecting') return true;
    // On an explicit API send, make one attempt to initialize a disconnected session.
    if (force) {
      try {
        await this.initializeClient(ADMIN_SESSION_ID);
        const after = await this.getStatus(ADMIN_SESSION_ID, true);
        return after.status === 'connected' || after.status === 'connecting';
      } catch (e) {
        console.warn('[WA ensureReady] auto-init attempt failed:', (e as any)?.message);
      }
    }
    return false;
  }

  async getClient(ADMIN_SESSION_ID: string, force: boolean = false): Promise<boolean> {
    return this.ensureReady(ADMIN_SESSION_ID, force);
  }

  isClientReady(ADMIN_SESSION_ID: string): boolean {
    const s = this.instances.get(ADMIN_SESSION_ID)?.status;
    return s === 'connected' || s === 'connecting';
  }

  onStatusChange(sessionId: string, callback: (status: string, data?: any) => void): void {
    this.statusCallbacks.set(sessionId, callback);
  }

  onQR(ADMIN_SESSION_ID: string, callback: (qr: string) => void): void {
    this.qrCallbacks.set(ADMIN_SESSION_ID, callback);
  }

  getStatusCallbacks(sessionId: string) {
    return this.statusCallbacks.get(sessionId);
  }

  async getStatus(ADMIN_SESSION_ID: string, force: boolean = false): Promise<{ status: string; phoneNumber?: string; qrCode?: string; appLocked?: boolean }> {
    const result = await this.apiRequest<{ status?: string; phone_number?: string; qr_code?: string; qr_required?: boolean; app_locked?: boolean }>(
      `/session/status?session_id=${ADMIN_SESSION_ID}`,
      'GET'
    );

    const status = result?.status || 'disconnected';
    const phoneNumber = result?.phone_number;
    const qrCode = result?.qr_code;
    const appLocked = result?.app_locked || false;

    const instance: WhatsAppClientInstance = {
      sessionId: ADMIN_SESSION_ID,
      status: status as any,
      phoneNumber,
      qrCode,
      appLocked,
    };
    this.instances.set(ADMIN_SESSION_ID, instance);

    return { status, phoneNumber, qrCode, appLocked };
  }

  async initializeClient(ADMIN_SESSION_ID: string): Promise<void> {
    console.log(`[WhatsApp] initializeClient called for ${ADMIN_SESSION_ID} - will CHECK STATUS FIRST via route, only trigger /init if not active (per server.py already-initialized guards)`);

    // Guard against concurrent init for same session (prevents opening browser twice from races e.g. task + status poll)
    let inFlight = this.initPromises.get(ADMIN_SESSION_ID);
    if (inFlight) {
      console.log(`[WhatsApp] Init already in progress for ${ADMIN_SESSION_ID}, awaiting...`);
      return inFlight;
    }

    inFlight = this._doInitialize(ADMIN_SESSION_ID).finally(() => {
      this.initPromises.delete(ADMIN_SESSION_ID);
    });
    this.initPromises.set(ADMIN_SESSION_ID, inFlight);
    return inFlight;
  }

  private async _doInitialize(ADMIN_SESSION_ID: string): Promise<void> {
    // ALWAYS check status via route first (as instructed). Only call init/login routes if status not active.
    // This prevents redundant init calls when server.py already has "already_init": true or active browser.
    let currentStatus: any = null;
    try {
      currentStatus = await this.getStatus(ADMIN_SESSION_ID, true); // force fresh
      const s = currentStatus?.status;
      const isActive = s === 'connected' || s === 'connecting';
      if (isActive) {
        console.log(`[WhatsApp] Status is ${s} (active) - skipping /session/init and /login. Server already initialized.`);
        // still update instance
        const inst = {
          sessionId: ADMIN_SESSION_ID,
          status: s as any,
          phoneNumber: currentStatus.phoneNumber,
          qrCode: currentStatus.qrCode,
          appLocked: currentStatus.appLocked || false,
        };
        this.instances.set(ADMIN_SESSION_ID, inst);
        const cb = this.statusCallbacks.get(ADMIN_SESSION_ID);
        if (cb) cb(s, { phoneNumber: currentStatus.phoneNumber, qrCode: currentStatus.qrCode, appLocked: inst.appLocked });
        return;
      }
    } catch (e) {
      console.log('[WhatsApp] Status check before init failed (will proceed to init):', (e as any)?.message);
    }

    // Only if not active: send initialize route
    console.log(`[WhatsApp] Status not active - triggering /session/init route`);
    await this.apiRequest('/session/init', 'POST', { session_id: ADMIN_SESSION_ID });

    // Then login
    const loginResult = await this.apiRequest<{ status?: string; phone_number?: string; qr_code?: string; qr_required?: boolean; app_locked?: boolean; message?: string }>(
      '/session/login',
      'POST',
      { session_id: ADMIN_SESSION_ID, timeout: 45 }
    );

    const status = loginResult?.status || 'connecting';
    const phoneNumber = loginResult?.phone_number;
    const qrCode = loginResult?.qr_code;
    const appLocked = loginResult?.app_locked || false;

    const instance: WhatsAppClientInstance = {
      sessionId: ADMIN_SESSION_ID,
      status: status as any,
      phoneNumber,
      qrCode,
      appLocked,
    };
    this.instances.set(ADMIN_SESSION_ID, instance);

    // Call status callbacks to notify UI
    const callback = this.statusCallbacks.get(ADMIN_SESSION_ID);
    if (callback) {
      callback(status, { phoneNumber, qrCode, qrRequired: loginResult?.qr_required, appLocked });
    }

    const qrCallback = this.qrCallbacks.get(ADMIN_SESSION_ID);
    if (qrCallback && qrCode) {
      qrCallback(qrCode);
    }

    // Keep DB updated
    try {
      await connectDB();
      await WhatsAppSession.findOneAndUpdate(
        { ADMIN_SESSION_ID },
        {
          status,
          phoneNumber,
          lastConnectedAt: status === 'connected' ? new Date() : undefined,
          updatedAt: new Date(),
        },
        { upsert: true }
      );

      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: status === 'connected' ? 'client_connected' : 'client_connecting',
        category: 'whatsapp_session',
        details: `WhatsApp client login: ${loginResult?.message || ''}`,
        success: status === 'connected',
      });
    } catch (e) {
      console.error('[WhatsApp] Failed to save session initialization to DB:', e);
    }
  }

  async sendMessage(ADMIN_SESSION_ID: string, to: string, message: string, contactName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const payload: { session_id: string; phone?: string; contact?: string; message: string } = {
      session_id: ADMIN_SESSION_ID,
      message,
    };

    if (contactName) {
      payload.contact = contactName;
    } else {
      payload.phone = to;
    }

    const result = await this.apiRequest<{ success: boolean; message?: string; error?: string }>(
      '/message/send',
      'POST',
      payload
    );

    const success = !!result?.success;
    const error = result?.error || (result ? undefined : 'WhatsApp server offline');

    try {
      await connectDB();
      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: success ? 'send_message' : 'send_message_failed',
        category: 'whatsapp_message',
        details: success ? `Message sent to ${contactName || to}` : `Failed: ${error}`,
        success,
        errorMessage: error,
      });
    } catch (e) {
      console.error('[WhatsApp] Failed to create send message audit log:', e);
    }

    return {
      success,
      messageId: success ? `msg_${Date.now()}` : undefined,
      error,
    };
  }

  async sendVerificationCode(ADMIN_SESSION_ID: string, to: string, code: string, contactName?: string): Promise<{ success: boolean; error?: string }> {
    const message = `🔐 *Your WhatsApp Verification Code*\n\n━━━━━━━━━━━━━━━━\n\n*${code}*\n\n━━━━━━━━━━━━━━━━\n\n⏰ This code expires in 10 minutes.\n\n🔒 Do not share this code with anyone.`;
    return this.sendMessage(ADMIN_SESSION_ID, to, message, contactName);
  }

  async disconnect(ADMIN_SESSION_ID: string): Promise<void> {
    await this.apiRequest('/session/disconnect', 'POST', { session_id: ADMIN_SESSION_ID });
    this.instances.delete(ADMIN_SESSION_ID);

    try {
      await connectDB();
      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: 'client_disconnected',
        category: 'whatsapp_session',
        details: 'WhatsApp client disconnected',
        success: true,
      });
    } catch (e) {
      console.error('[WhatsApp] Failed to save disconnect audit log:', e);
    }
  }

  async logout(ADMIN_SESSION_ID: string): Promise<{ success: boolean; error?: string }> {
    // Prefer dedicated /session/logout route (per server.py) for full WA Web logout
    const result = await this.apiRequest<{ success?: boolean; message?: string; error?: string }>(
      '/session/logout', 'POST', { session_id: ADMIN_SESSION_ID }, 15000
    );
    this.instances.delete(ADMIN_SESSION_ID);
    try {
      await connectDB();
      await WhatsAppSession.findOneAndUpdate(
        { ADMIN_SESSION_ID },
        { status: 'disconnected', updatedAt: new Date() },
        { upsert: true }
      );
      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: 'client_logout',
        category: 'whatsapp_session',
        details: 'WhatsApp client logged out via dedicated /session/logout route',
        success: !!result?.success,
      });
    } catch (e) { /* non-fatal */ }
    return { success: !!result?.success, error: result?.error };
  }

  async removeSession(ADMIN_SESSION_ID: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.apiRequest<{ success?: boolean; error?: string }>(
      '/session/remove', 'POST', { session_id: ADMIN_SESSION_ID }, 15000
    );
    this.instances.delete(ADMIN_SESSION_ID);
    try {
      await connectDB();
      await WhatsAppSession.deleteOne({ ADMIN_SESSION_ID });
      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: 'session_removed',
        category: 'whatsapp_session',
        details: 'Full session removed (data cleared)',
        success: !!result?.success,
      });
    } catch (e) { /* ignore */ }
    return { success: !!result?.success, error: result?.error };
  }

  async regenerateQR(ADMIN_SESSION_ID: string): Promise<string> {
    await this.disconnect(ADMIN_SESSION_ID);
    await this.initializeClient(ADMIN_SESSION_ID);
    return '';
  }

  async saveSession(ADMIN_SESSION_ID: string): Promise<{ success: boolean; sessionData?: string; cookieCount?: number; error?: string }> {
    const result = await this.apiRequest<{ success: boolean; session_data?: string; cookie_count?: number; error?: string }>(
      '/session/save',
      'POST',
      { session_id: ADMIN_SESSION_ID }
    );
    return {
      success: !!result?.success,
      sessionData: result?.session_data,
      cookieCount: result?.cookie_count,
      error: result?.error,
    };
  }

  async loadSession(ADMIN_SESSION_ID: string, sessionData: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.apiRequest<{ success: boolean; error?: string }>(
      '/session/load',
      'POST',
      { session_id: ADMIN_SESSION_ID, session_data: sessionData }
    );
    return {
      success: !!result?.success,
      error: result?.error,
    };
  }

  async setDbSession(ADMIN_SESSION_ID: string, sessionData: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.apiRequest<{ success: boolean; error?: string }>(
      '/session/set-db',
      'POST',
      { session_id: ADMIN_SESSION_ID, session_data: sessionData }
    );
    return {
      success: !!result?.success,
      error: result?.error,
    };
  }

  async checkMessageStatus(ADMIN_SESSION_ID: string, phone?: string, contact?: string): Promise<{ success: boolean; status?: any; error?: string }> {
    if (contact) {
      return this.getPollStatus(ADMIN_SESSION_ID, contact);
    }
    return {
      success: false,
      error: 'Message status check requires a contact name (no /message/check-status on whatsapp_server.py)',
    };
  }

  async getPollStatus(ADMIN_SESSION_ID: string, contact: string, question?: string): Promise<{ success: boolean; status?: any; error?: string }> {
    try {
      const result = await getPythonWhatsAppClient().pollStatus({
        session_id: ADMIN_SESSION_ID,
        contact,
        question,
      });
      return { success: !!result.success, status: result, error: result.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async parsePollResults(ADMIN_SESSION_ID: string, contact: string, question?: string): Promise<{ success: boolean; options?: any[]; total_votes?: number; error?: string }> {
    const payload: any = { session_id: ADMIN_SESSION_ID, contact };
    if (question) payload.question = question;

    const result = await this.apiRequest<{ success: boolean; options?: any[]; total_votes?: number; error?: string }>(
      '/poll/parse-results',
      'POST',
      payload
    );
    return {
      success: !!result?.success,
      options: result?.options,
      total_votes: result?.total_votes,
      error: result?.error,
    };
  }

  async validateSession(ADMIN_SESSION_ID: string): Promise<{ success: boolean; valid?: boolean; reason?: string; needs_reauth?: boolean; error?: string }> {
    try {
      const result = await getPythonWhatsAppClient().validateSession(ADMIN_SESSION_ID);
      return { ...result, success: result.success !== false };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async listSessions(): Promise<{ success: boolean; sessions?: any[]; error?: string }> {
    const result = await this.apiRequest<any[]>('/sessions', 'GET');
    return {
      success: !!result,
      sessions: result || [],
    };
  }

  async getPythonHealth(): Promise<{ success: boolean; health?: any; error?: string }> {
    const result = await this.apiRequest<any>('/health', 'GET');
    return {
      success: !!result,
      health: result,
    };
  }

  async setupAppLock(_ADMIN_SESSION_ID: string, _password: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'App lock is not available via whatsapp_server.py API' };
  }

  async lockApp(_ADMIN_SESSION_ID: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'App lock is not available via whatsapp_server.py API' };
  }

  async unlockApp(_ADMIN_SESSION_ID: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'App lock is not available via whatsapp_server.py API' };
  }
}

export const whatsappClientManager = new WhatsAppClientManager();
export default whatsappClientManager;
