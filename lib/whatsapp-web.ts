import WhatsAppSession from './models/WhatsAppSession';
import AuditLog from './models/AuditLog';
import connectDB from './mongodb';

const PYTHON_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8765';

interface WhatsAppClientInstance {
  sessionId: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  qrCode?: string;
  phoneNumber?: string;
}

interface PythonServerResponse {
  success?: boolean;
  status?: string;
  qr_required?: boolean;
  qr_code?: string;
  message?: string;
  phone_number?: string;
  session_exists?: boolean;
  error?: string;
}

class WhatsAppClientManager {
  private instances: Map<string, WhatsAppClientInstance> = new Map();
  private qrCallbacks: Map<string, (qr: string) => void> = new Map();
  private statusCallbacks: Map<string, (status: string, data?: unknown) => void> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  private async apiRequest<T>(endpoint: string, method: string = 'GET', body?: unknown, timeoutMs: number = 5000): Promise<T> {
    const url = `${PYTHON_SERVER_URL}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`API request timeout: ${timeoutMs}ms exceeded for ${endpoint}`);
      }
      
      if (error instanceof TypeError && error.message.includes('fetch failed')) {
        // Silently return null for connection failures to let callers handle it gracefully
        return null as unknown as T;
      }
      throw error;
    }
  }

  async initializeClient(ADMIN_SESSION_ID: string): Promise<void> {
    await connectDB();

    const sessionId = ADMIN_SESSION_ID;
    // If an instance already exists and is not disconnected/failed, skip re-initialization
    const existing = this.instances.get(sessionId);
    if (existing) {
      // If already connected, don't reinitialize - this was causing the reconnect loop!
      if (existing.status === 'connected') {
        console.log(`[WhatsApp] initializeClient skipped for ${sessionId}, already connected`);
        return;
      }
      // If connecting, also skip to prevent duplicate connection attempts
      if (existing.status === 'connecting') {
        console.log(`[WhatsApp] initializeClient skipped for ${sessionId}, already connecting`);
        return;
      }
      // Only reinitialize if disconnected or failed
    }

    this.instances.set(sessionId, {
      sessionId,
      status: 'connecting',
    });

    try {
      // Use longer timeout for initialization (15 seconds)
      const initResult = await this.apiRequest('/session/init', 'POST', { session_id: sessionId }, 15000);
      if (!initResult) throw new Error('OFFLINE');
      
      const loginResult = await this.apiRequest<PythonServerResponse>('/session/login', 'POST', {
        session_id: sessionId,
        timeout: 45
      }, 45000);
      
      if (!loginResult) throw new Error('OFFLINE');

      const instance = this.instances.get(sessionId);
      if (instance) {
        if (loginResult.status === 'connected') {
          instance.status = 'connected';
          instance.phoneNumber = loginResult.phone_number;
          
          const callback = this.statusCallbacks.get(sessionId);
          if (callback) callback('connected', { phoneNumber: loginResult.phone_number });
        } else if (loginResult.qr_required) {
          instance.status = 'connecting';
          
          const callback = this.statusCallbacks.get(sessionId);
          if (callback) callback('connecting', { qrRequired: true });
        }
      }

      await WhatsAppSession.findOneAndUpdate(
        { ADMIN_SESSION_ID },
        {
          status: loginResult.status || 'connecting',
          phoneNumber: loginResult.phone_number,
          lastConnectedAt: loginResult.status === 'connected' ? new Date() : undefined,
          updatedAt: new Date(),
        },
        { upsert: true }
      );

      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: loginResult.status === 'connected' ? 'client_connected' : 'client_connecting',
        category: 'whatsapp_session',
        details: `WhatsApp client ${loginResult.status}: ${loginResult.message || ''}`,
        success: loginResult.status === 'connected',
      });

      if (loginResult.status !== 'connected') {
        this.startStatusPolling(sessionId, ADMIN_SESSION_ID);
      }

    } catch (error) {
      if (error instanceof Error && error.message === 'OFFLINE') {
        const instance = this.instances.get(sessionId);
        if (instance) instance.status = 'disconnected';
        return;
      }
      console.error('[WhatsApp] Initialization error:', error);
      const instance = this.instances.get(sessionId);
      if (instance) {
        instance.status = 'failed';
      }
      
      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: 'initialization_failed',
        category: 'whatsapp_session',
        details: 'Failed to initialize WhatsApp client',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });
    }
  }

  private startStatusPolling(sessionId: string, ADMIN_SESSION_ID: string): void {
    // Clear any existing polling
    const existingInterval = this.pollIntervals.get(sessionId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    let pollCount = 0;
    const maxPolls = 120; // Maximum 10 minutes of polling (120 * 5s)
    
    const interval = setInterval(async () => {
      pollCount++;
      
      try {
        const status = await this.getStatus(sessionId);
        const instance = this.instances.get(sessionId);
        
        if (!status || status.status === 'disconnected') {
          // If disconnected, we can stop polling or just continue silently
          if (pollCount > 12) { // Stop after 1 minute of disconnected state during polling
            clearInterval(interval);
            this.pollIntervals.delete(sessionId);
          }
          return;
        }
        
        // Stop polling if connected or max polls reached
        if (status.status === 'connected' || pollCount >= maxPolls) {
          if (instance) {
            instance.status = status.status as 'connected' | 'disconnected' | 'failed';
            instance.phoneNumber = status.phoneNumber;
          }
          
          if (status.status === 'connected') {
            const callback = this.statusCallbacks.get(sessionId);
            if (callback) callback('connected', { phoneNumber: status.phoneNumber });
          }
          
          clearInterval(interval);
          this.pollIntervals.delete(sessionId);
          return;
        }
        
        // Update instance status
        if (instance && status.status) {
          instance.status = status.status as 'connected' | 'connecting' | 'disconnected';
        }
      } catch (error) {
        console.error('[WhatsApp] Status poll error:', error);
      }
    }, 5000);

    this.pollIntervals.set(sessionId, interval);
  }

  async getClient(ADMIN_SESSION_ID: string): Promise<boolean> {
    const instance = this.instances.get(ADMIN_SESSION_ID);
    
    // If already connected, return true immediately without any reconnection attempts
    if (instance?.status === 'connected') {
      return true;
    }

    // Only reinitialize if not connected
    if (!instance || instance.status === 'disconnected' || instance.status === 'failed' || instance.status === undefined) {
      await this.initializeClient(ADMIN_SESSION_ID);
    }

    // Get the updated instance status
    const updatedInstance = this.instances.get(ADMIN_SESSION_ID);
    return updatedInstance?.status === 'connected';
  }

  async sendMessage(ADMIN_SESSION_ID: string, to: string, message: string, contactName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const isConnected = await this.getClient(ADMIN_SESSION_ID);
      
      if (!isConnected) {
        throw new Error('WhatsApp client not connected');
      }

      const payload: { session_id: string; phone?: string; contact?: string; message: string } = {
        session_id: ADMIN_SESSION_ID,
        message: message
      };

      // Use contact name if provided, otherwise use phone number
      if (contactName) {
        payload.contact = contactName;
      } else {
        payload.phone = to;
      }

      const result = await this.apiRequest<{ success: boolean; message?: string; error?: string }>(
        '/message/send',
        'POST',
        payload,
        35000 
      );

      if (!result) return { success: false, error: 'WhatsApp server offline' };

      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: result.success ? 'send_message' : 'send_message_failed',
        category: 'whatsapp_message',
        details: result.success ? `Message sent to ${contactName || to}` : `Failed: ${result.error}`,
        success: result.success,
        errorMessage: result.error,
      });

      return {
        success: result.success,
        messageId: result.success ? `msg_${Date.now()}` : undefined,
        error: result.error,
      };
    } catch (error) {
      console.error('[WhatsApp] Send message error:', error);
      
      await AuditLog.create({
        ADMIN_SESSION_ID,
        action: 'send_message_failed',
        category: 'whatsapp_message',
        details: `Failed to send message to ${to}`,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendMedia(ADMIN_SESSION_ID: string, _to: string, _mediaPath: string, _caption?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return {
      success: false,
      error: 'Media sending not supported in Python implementation yet',
    };
  }

  onQR(ADMIN_SESSION_ID: string, callback: (qr: string) => void): void {
    this.qrCallbacks.set(ADMIN_SESSION_ID, callback);
  }

  onStatusChange(sessionId: string, callback: (status: string, data?: unknown) => void): void {
    this.statusCallbacks.set(sessionId, callback);
  }

  // Get existing status callbacks for a session (to prevent duplicate listeners)
  getStatusCallbacks(sessionId: string): ((status: string, data?: unknown) => void) | undefined {
    return this.statusCallbacks.get(sessionId);
  }

  async getStatus(ADMIN_SESSION_ID: string): Promise<{ status: string; phoneNumber?: string; qrCode?: string }> {
    try {
      // Ensure instance exists first (critical for status sync)
      if (!this.instances.has(ADMIN_SESSION_ID)) {
        this.instances.set(ADMIN_SESSION_ID, {
          sessionId: ADMIN_SESSION_ID,
          status: 'disconnected',
        });
      }

      // Use a longer timeout for status checks
      const result = await this.apiRequest<PythonServerResponse>(
        `/session/status?session_id=${ADMIN_SESSION_ID}`,
        'GET',
        undefined,
        12000 // 12 second timeout for status checks
      );

      const instance = this.instances.get(ADMIN_SESSION_ID)!;
      
      if (!result) {
        // Connection failed, treat as disconnected but don't log error
        instance.status = 'disconnected';
        return { status: 'disconnected' };
      }
      
      // CRITICAL FIX: Always sync the instance status from the Python server response
      // This ensures that when Python reports "connected", we don't incorrectly return stale status
      if (result.status === 'connected') {
        instance.status = 'connected';
        instance.phoneNumber = result.phone_number;
        console.log(`[WhatsApp] Status synced for ${ADMIN_SESSION_ID}: connected (from Python server)`);
      } else if (result.status === 'connecting') {
        // If Python says connecting, only update if we were already connecting or disconnected
        // Don't overwrite 'connected' with 'connecting' - this was the root cause!
        if (instance.status !== 'connected') {
          instance.status = 'connecting';
        }
        console.log(`[WhatsApp] Status synced for ${ADMIN_SESSION_ID}: connecting`);
      } else if (result.status === 'disconnected' || result.status === 'failed') {
        instance.status = result.status as 'disconnected' | 'failed';
        console.log(`[WhatsApp] Status synced for ${ADMIN_SESSION_ID}: ${instance.status}`);
      }

      console.log(`[WhatsApp] Status synced for ${ADMIN_SESSION_ID}: ${instance.status}${instance.phoneNumber ? ` (${instance.phoneNumber})` : ''}`);

      return {
        status: instance.status,
        phoneNumber: instance.phoneNumber,
        qrCode: result.qr_code,
      };
    } catch (error) {
      // Quietly handle errors in status fetching
      
      // Return last known status from instance - only return connected if we KNOW we're connected
      const instance = this.instances.get(ADMIN_SESSION_ID);
      if (instance && instance.status === 'connected') {
        return {
          status: 'connected',
          phoneNumber: instance.phoneNumber,
        };
      }
      
      return {
        status: 'disconnected',
      };
    }
  }

  async disconnect(ADMIN_SESSION_ID: string): Promise<void> {
    const pollInterval = this.pollIntervals.get(ADMIN_SESSION_ID);
    if (pollInterval) {
      clearInterval(pollInterval);
      this.pollIntervals.delete(ADMIN_SESSION_ID);
    }

    const reconnectTimer = this.reconnectTimers.get(ADMIN_SESSION_ID);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(ADMIN_SESSION_ID);
    }

    try {
      await this.apiRequest('/session/disconnect', 'POST', { session_id: ADMIN_SESSION_ID }, 10000);
    } catch (error) {
      console.error('[WhatsApp] Disconnect error:', error);
    }

    this.instances.delete(ADMIN_SESSION_ID);

    await AuditLog.create({
      ADMIN_SESSION_ID,
      action: 'client_disconnected',
      category: 'whatsapp_session',
      details: 'WhatsApp client manually disconnected',
      success: true,
    });
  }

  async regenerateQR(ADMIN_SESSION_ID: string): Promise<string> {
    await this.disconnect(ADMIN_SESSION_ID);
    await this.initializeClient(ADMIN_SESSION_ID);
    return '';
  }

  isClientReady(ADMIN_SESSION_ID: string): boolean {
    const instance = this.instances.get(ADMIN_SESSION_ID);
    return instance?.status === 'connected';
  }

  async saveSession(ADMIN_SESSION_ID: string, retries: number = 3): Promise<{ success: boolean; sessionData?: string; cookieCount?: number; error?: string }> {
    try {
      const result = await this.apiRequest<{ success: boolean; session_data?: string; cookie_count?: number; error?: string }>(
        '/session/save',
        'POST',
        { session_id: ADMIN_SESSION_ID },
        15000
      );

      return {
        success: result.success,
        sessionData: result.session_data,
        cookieCount: result.cookie_count,
        error: result.error
      };
    } catch (error) {
      console.error('[WhatsApp] Save session error:', error);
      
      // Retry logic for timeout errors
      if (error instanceof Error && error.message.includes('timeout') && retries > 0) {
        console.log(`[WhatsApp] Retrying save session (${retries} retries left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return this.saveSession(ADMIN_SESSION_ID, retries - 1);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save session'
      };
    }
  }

  async loadSession(ADMIN_SESSION_ID: string, sessionData: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.apiRequest<{ success: boolean; message?: string; error?: string }>(
        '/session/load',
        'POST',
        { session_id: ADMIN_SESSION_ID, session_data: sessionData }
      );

      if (!result) return { success: false, error: 'WhatsApp server offline' };

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      console.error('[WhatsApp] Load session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load session'
      };
    }
  }

  async sendVerificationCode(ADMIN_SESSION_ID: string, to: string, code: string, contactName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const isConnected = await this.getClient(ADMIN_SESSION_ID);
      
      if (!isConnected) {
        return { success: false, error: 'WhatsApp client not connected' };
      }

      const message = `🔐 *Your WhatsApp Verification Code*\n\n━━━━━━━━━━━━━━━━\n\n*${code}*\n\n━━━━━━━━━━━━━━━━\n\n⏰ This code expires in 10 minutes.\n\n🔒 Do not share this code with anyone.`;

      const result = await this.sendMessage(ADMIN_SESSION_ID, to, message, contactName || undefined);
      
      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      console.error('[WhatsApp] Send verification code error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send verification code'
      };
    }
  }
}

export const whatsappClientManager = new WhatsAppClientManager();
export default whatsappClientManager;
