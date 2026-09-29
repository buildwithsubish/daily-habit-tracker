/**
 * Centralized HTTP client for whatsapp_server.py.
 * Only routes exposed by whatsapp_server.py are supported.
 */

const PYTHON_SERVER_URL = (process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = Number(process.env.WA_CLIENT_TIMEOUT_MS || 120000);

export type PythonRequestOptions = {
  skipEnsure?: boolean;
  timeoutMs?: number;
};

export class PythonWhatsAppClient {
  private baseUrl: string;

  constructor(baseUrl: string = PYTHON_SERVER_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown,
    opts?: PythonRequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await response.text().catch(() => '');
      let data: T;
      try {
        data = text ? JSON.parse(text) : ({} as T);
      } catch {
        throw new Error(`Invalid JSON from ${endpoint}: ${text.slice(0, 200)}`);
      }

      if (!response.ok) {
        const detail = typeof (data as any)?.error === 'string' ? (data as any).error : text.slice(0, 200);
        throw new Error(`WhatsApp server ${endpoint} failed: ${response.status}${detail ? ` — ${detail}` : ''}`);
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        throw new Error(`WhatsApp server ${endpoint} timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  health() {
    return this.request<{ status: string; timestamp?: string }>('/health');
  }

  sessionStatus(sessionId: string) {
    return this.request<any>(`/session/status?session_id=${encodeURIComponent(sessionId)}`);
  }

  /** /session/validate is not exposed — derive validity from session status. */
  async validateSession(sessionId: string) {
    const status = await this.sessionStatus(sessionId);
    const s = String(status?.status || 'unknown').toLowerCase();
    const valid = s === 'connected' || s === 'connecting';
    return {
      success: true,
      valid,
      status: s,
      needs_reauth: !valid,
      reason: valid ? undefined : `Session status: ${s}`,
    };
  }

  sendMessage(payload: { session_id: string; message: string; phone?: string; contact?: string }) {
    return this.request<any>('/message/send', 'POST', payload);
  }

  pollResults(payload: { session_id: string; contact: string; question?: string }) {
    return this.request<any>('/poll/results', 'POST', payload);
  }

  /** /poll/status is not exposed — derive from poll results. */
  async pollStatus(payload: { session_id: string; contact: string; question?: string }) {
    const result = await this.pollResults(payload);
    if (!result?.success) {
      return { success: false, status: 'unknown', error: result?.error || 'poll check failed' };
    }
    const totalVotes = Number(result.total_votes || 0);
    const responseTime = result.response_time;
    let status = 'sent';
    if (totalVotes > 0 || responseTime) status = 'read';
    else if (Array.isArray(result.options) && result.options.length > 0) status = 'delivered';
    return { success: true, status, total_votes: totalVotes, derived_from: '/poll/results' };
  }

  parsePollResults(payload: { session_id: string; contact: string; question?: string }) {
    return this.request<any>('/poll/parse-results', 'POST', payload);
  }

  createPoll(payload: {
    session_id: string;
    contact: string;
    question: string;
    options: string[];
    allow_multiple?: boolean;
  }) {
    return this.request<any>('/poll/create', 'POST', payload);
  }

  openOrCreateContact(payload: { session_id: string; contact_name: string; phone_number?: string }) {
    return this.request<any>('/contact/open-or-create', 'POST', payload);
  }

  checkContact(sessionId: string, contactName: string) {
    const q = `session_id=${encodeURIComponent(sessionId)}&contact_name=${encodeURIComponent(contactName)}`;
    return this.request<any>(`/contact/check?${q}`, 'POST');
  }

  listSessions() {
    return this.request<{ sessions?: Array<{ session_id: string; status: string }> }>('/sessions');
  }
}

let _singleton: PythonWhatsAppClient | null = null;

export function getPythonWhatsAppClient(): PythonWhatsAppClient {
  if (!_singleton) _singleton = new PythonWhatsAppClient();
  return _singleton;
}

export function getPythonServerUrl(): string {
  return PYTHON_SERVER_URL;
}