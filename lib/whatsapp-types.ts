export * from './whatsapp';
export * from './whatsapp-web';
export * from './whatsapp-automation';
export * from './security';

export interface WhatsAppUserSettings {
  whatsappNumber?: string;
  whatsappVerified: boolean;
  whatsappAutomation: boolean;
  whatsappSendTime?: string;
  whatsappFrequency?: 'daily' | 'weekly';
  whatsappReminderCount?: number;
}

export interface BroadcastFilters {
  activeOnly?: boolean;
  automationEnabled?: boolean;
  category?: string;
  engagementLevel?: string;
}

export interface BroadcastResult {
  totalUsers: number;
  messagesSent: number;
  messagesFailed: number;
}

export interface WeeklyReportData {
  weekStartDate: string;
  weekEndDate: string;
  totalHabits: number;
  completedHabits: number;
  completionRate: number;
  responseRate: number;
  improvementFromLastWeek: number;
}

export interface WhatsAppSessionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  phoneNumber?: string;
  qrCode?: string;
  lastConnectedAt?: string;
  failureReason?: string;
}
