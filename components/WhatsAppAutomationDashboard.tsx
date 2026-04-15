
'use client';

import { useState, useEffect, useCallback, useMemo, memo, ReactNode, ElementType, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Clock,
  Calendar,
  Bell,
  BellOff,
  Zap,
  ZapOff,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  Minimize2,
  Maximize2,
  Smartphone,
  Wifi,
  WifiOff,
  Activity,
  Timer,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWhatsApp } from '@/contexts/WhatsAppStatusContext';

interface AutomationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  weeklySummary: boolean;
  pollCreation: boolean;
  streakAlerts: boolean;
  reminderTime: string;
  summaryDay: number;
}

interface WhatsAppAutomationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

interface SchedulerStatus {
  running: boolean;
  nextRun?: string;
  jobs: string[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: string;
  description: string;
}

// Move static data outside component
const QUICK_ACTIONS: QuickAction[] = [
  { id: 'send_daily', label: 'Send Daily Checklist', icon: Send, action: 'send_daily', description: 'Send today\'s habits to all users' },
  { id: 'send_reminder', label: 'Send Reminder', icon: Bell, action: 'send_reminder', description: 'Send reminder to pending users' },
  { id: 'send_poll', label: 'Create Poll', icon: BarChart3, action: 'send_poll', description: 'Create weekly poll for all users' },
  { id: 'send_summary', label: 'Weekly Summary', icon: Calendar, action: 'send_summary', description: 'Send weekly progress summary' },
];

const DEFAULT_NOTIFICATION_PREFS = {
  onConnect: true,
  onDisconnect: true,
  onMessageReceived: true,
  onScheduleMissed: true
};

// Memoize ToggleSwitch component
const ToggleSwitch = memo(({ 
  enabled, 
  onChange, 
  disabled = false,
  color = 'green'
}: { 
  enabled: boolean; 
  onChange: (val: boolean) => void;
  disabled?: boolean;
  color?: 'green' | 'blue' | 'red';
}) => {
  const colors = {
    green: { active: 'bg-green-500', inactive: 'bg-zinc-300 dark:bg-zinc-700' },
    blue: { active: 'bg-blue-500', inactive: 'bg-zinc-300 dark:bg-zinc-700' },
    red: { active: 'bg-red-500', inactive: 'bg-zinc-300 dark:bg-zinc-700' }
  };
  
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        enabled ? colors[color].active : colors[color].inactive
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      disabled={disabled}
      aria-label={`Toggle ${color} switch`}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
        animate={{ left: enabled ? '1.75rem' : '0.25rem' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
});

ToggleSwitch.displayName = 'ToggleSwitch';

// Memoize SectionCard component
const SectionCard = memo(({ 
  id, 
  title, 
  icon: Icon, 
  children, 
  badge,
  badgeColor,
  isExpanded,
  onToggle
}: { 
  id: string; 
  title: string; 
  icon: ElementType; 
  children: ReactNode; 
  badge?: string;
  badgeColor?: 'green' | 'red' | 'yellow' | 'blue';
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) => {
  const badgeColors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  };
  
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isExpanded ? 'bg-green-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}>
            <Icon size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColors[badgeColor || 'green']}`}>
                {badge}
              </span>
            )}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800">
          {children}
        </div>
      )}
    </div>
  );
});

SectionCard.displayName = 'SectionCard';

// Extract TestMessage section into its own component
const TestMessageSection = memo(({ 
  isConnected, 
  isAdmin,
  onSend 
}: { 
  isConnected: boolean;
  isAdmin: boolean;
  onSend: (message: string) => Promise<void>;
}) => {
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSend = async () => {
    if (!testMessage.trim() || sendingTest) return;
    
    setSendingTest(true);
    try {
      await onSend(testMessage);
      setTestMessage('');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <SectionCard
      id="test"
      title="Test Message"
      icon={Send}
      badge="Send to your number"
      badgeColor="blue"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      <div className="pt-4 space-y-3">
        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="Type your test message here..."
          rows={3}
          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
        />
        <button
          onClick={handleSend}
          disabled={sendingTest || !testMessage.trim() || !isConnected}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sendingTest ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          Send Test Message
        </button>
      </div>
    </SectionCard>
  );
});

TestMessageSection.displayName = 'TestMessageSection';

// Main component
function WhatsAppAutomationDashboardComponent({
  isOpen,
  onClose,
  isAdmin = false
}: WhatsAppAutomationDashboardProps) {
  // Use refs to track mounted state and prevent updates after unmount
  const isMounted = useRef(true);
  
  // Extract only what's needed from context
  const whatsAppContext = useWhatsApp();
  const status = whatsAppContext.status;
  const schedulerStatus = whatsAppContext.schedulerStatus;
  const refreshStatus = whatsAppContext.refreshStatus;
  const refreshSchedulerStatus = whatsAppContext.refreshSchedulerStatus;
  
  // Local state
  const [localLoading, setLocalLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('status');
  const [saving, setSaving] = useState(false);
  
  // Use ref for time to avoid re-renders
  const timeRef = useRef({
    timeString: new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    }),
    dateString: new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  });
  
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
    enabled: false,
    dailyReminder: true,
    weeklySummary: true,
    pollCreation: true,
    streakAlerts: true,
    reminderTime: '08:00',
    summaryDay: 0
  });
  
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);

  // Use ref for quickActions to prevent re-renders
  const quickActionsRef = useRef(QUICK_ACTIONS);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    
    fetchAutomationSettings();
  }, [isOpen]);

  const fetchAutomationSettings = async () => {
    try {
      const res = await fetch('/api/whatsapp/automation-settings');
      if (res.ok && isMounted.current) {
        const data = await res.json();
        if (data.settings) {
          setAutomationSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (error) {
      console.error('[WhatsApp Dashboard] Failed to fetch settings:', error);
    }
  };

  const handleToggleAutomation = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/automation-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (res.ok && isMounted.current) {
        setAutomationSettings(prev => ({ ...prev, enabled }));
        toast.success(enabled ? 'WhatsApp automation enabled' : 'WhatsApp automation disabled');
      } else {
        toast.error('Failed to update automation settings');
      }
    } catch (error) {
      console.error('[WhatsApp Dashboard] Toggle error:', error);
      toast.error('Failed to update settings');
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  const handleSettingChange = async (key: keyof AutomationSettings, value: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/automation-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      
      if (res.ok && isMounted.current) {
        setAutomationSettings(prev => ({ ...prev, [key]: value }));
        toast.success('Settings updated');
      } else {
        toast.error('Failed to update setting');
      }
    } catch (error) {
      console.error('[WhatsApp Dashboard] Setting change error:', error);
      toast.error('Failed to update setting');
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/whatsapp/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Action completed');
        refreshSchedulerStatus();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('[WhatsApp Dashboard] Quick action error:', error);
      toast.error('Action failed');
    }
  };

  const handleSchedulerToggle = async () => {
    try {
      // Use the user scheduler endpoint (no admin required)
      const action = schedulerStatus.running ? 'stop' : 'start';
      const res = await fetch('/api/user/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        refreshSchedulerStatus();
      } else {
        toast.error(data.error || 'Failed to toggle scheduler');
      }
    } catch (error) {
      console.error('[WhatsApp Dashboard] Scheduler toggle error:', error);
      toast.error('Failed to toggle scheduler');
    }
  };

  const handleSendTestMessage = async (message: string) => {
    try {
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Test message sent successfully');
      } else {
        toast.error(data.error || 'Failed to send test message');
      }
    } catch (error) {
      console.error('[WhatsApp Dashboard] Send test error:', error);
      toast.error('Failed to send test message');
    }
  };

  // Memoize status info
  const statusInfo = useMemo(() => {
    const statusValue = status.status;
    return {
      statusColor: statusValue === 'connected' ? 'bg-green-500' : statusValue === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500',
      statusIcon: statusValue === 'connected' ? Wifi : statusValue === 'connecting' ? RefreshCw : WifiOff,
      isConnected: statusValue === 'connected',
      isConnecting: statusValue === 'connecting',
    };
  }, [status.status]);

  const StatusIcon = statusInfo.statusIcon;

  const toggleSection = useCallback((section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  }, []);

  // Format functions
  const formatTime = (time: string) => time;
  const formatDate = (date: string) => date;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="whatsapp-automation-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden w-full ${
            isMinimized ? 'max-w-md' : 'max-w-2xl max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-emerald-600 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="text-white w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">WhatsApp Automation</h2>
                  <p className="text-green-100 text-xs sm:text-sm">
                    {isAdmin ? 'Admin Control Panel' : 'Manage your automation settings'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                  aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 size={18} className="text-white" /> : <Minimize2 size={18} className="text-white" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>
            
            {/* Status Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.statusColor}`} />
                  <span className="text-white text-sm font-medium capitalize">{status.status}</span>
                </div>
                
                {status.status === 'connected' && status.phoneNumber && (
                  <div className="flex items-center gap-1.5 text-green-100 text-xs">
                    <Smartphone size={14} />
                    <span className="font-mono">{status.phoneNumber}</span>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-green-100 text-xs">IST Time</p>
                <p className="text-white font-bold text-lg">{formatTime(timeRef.current.timeString)}</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          {!isMinimized && (
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    automationSettings.enabled 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                  }`}>
                    {automationSettings.enabled ? <Zap size={24} /> : <ZapOff size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Automation</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {automationSettings.enabled ? 'Active and running' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  enabled={automationSettings.enabled}
                  onChange={handleToggleAutomation}
                  disabled={saving || status.status !== 'connected'}
                />
              </div>
              
              {/* Connection Status Section */}
              <SectionCard
                id="status"
                title="Connection Status"
                icon={StatusIcon}
                badge={status.status === 'connected' ? 'Active' : 'Offline'}
                badgeColor={status.status === 'connected' ? 'green' : 'red'}
                isExpanded={expandedSection === 'status'}
                onToggle={toggleSection}
              >
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                      <Wifi size={20} className={`mx-auto mb-1 ${status.status === 'connected' ? 'text-green-500' : 'text-zinc-400'}`} />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Status</p>
                      <p className={`font-bold text-sm capitalize ${status.status === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
                        {status.status}
                      </p>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                      <Activity size={20} className="mx-auto mb-1 text-blue-500" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Scheduler</p>
                      <p className={`font-bold text-sm ${schedulerStatus.running ? 'text-green-600' : 'text-zinc-400'}`}>
                        {schedulerStatus.running ? 'Running' : 'Stopped'}
                      </p>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                      <Timer size={20} className="mx-auto mb-1 text-purple-500" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Next Run</p>
                      <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                        {schedulerStatus.nextRun && typeof schedulerStatus.nextRun === 'object' 
                          ? (() => {
                              const nextRunObj = schedulerStatus.nextRun as { [key: string]: string };
                              const nextRunTimes = Object.values(nextRunObj).filter(Boolean);
                              if (nextRunTimes.length === 0) return '--:--';
                              const earliest = nextRunTimes.reduce((a, b) => 
                                new Date(a).getTime() < new Date(b).getTime() ? a : b
                              );
                              return new Date(earliest).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
                            })()
                          : schedulerStatus.nextRun 
                            ? new Date(schedulerStatus.nextRun as string).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
                            : '--:--'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                      <MessageSquare size={20} className="mx-auto mb-1 text-orange-500" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Jobs</p>
                      <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                        {schedulerStatus.jobs.length}
                      </p>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={handleSchedulerToggle}
                        disabled={saving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                          schedulerStatus.running
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 dark:hover:bg-green-900/50'
                        }`}
                      >
                        {schedulerStatus.running ? <><Pause size={16} /> Stop Scheduler</> : <><Play size={16} /> Start Scheduler</>}
                      </button>
                      
                      <button
                        onClick={refreshStatus}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-medium text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                      >
                        <RefreshCw size={16} className={saving ? 'animate-spin' : ''} /> Refresh
                      </button>
                    </div>
                  )}
                </div>
              </SectionCard>
              
              {/* Scheduling Section */}
              <SectionCard
                id="scheduling"
                title="Scheduling"
                icon={Calendar}
                badge={automationSettings.enabled ? 'Enabled' : 'Disabled'}
                badgeColor={automationSettings.enabled ? 'green' : 'yellow'}
                isExpanded={expandedSection === 'scheduling'}
                onToggle={toggleSection}
              >
                <div className="pt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Bell size={18} className="text-green-500" />
                        <div>
                          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Daily Reminders</p>
                          <p className="text-xs text-zinc-500">Send habit checklist daily</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        enabled={automationSettings.dailyReminder}
                        onChange={(val) => handleSettingChange('dailyReminder', val)}
                        disabled={!automationSettings.enabled || saving}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-blue-500" />
                        <div>
                          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Weekly Summary</p>
                          <p className="text-xs text-zinc-500">Send weekly progress report</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        enabled={automationSettings.weeklySummary}
                        onChange={(val) => handleSettingChange('weeklySummary', val)}
                        disabled={!automationSettings.enabled || saving}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <BarChart3 size={18} className="text-purple-500" />
                        <div>
                          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Poll Creation</p>
                          <p className="text-xs text-zinc-500">Create weekly polls</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        enabled={automationSettings.pollCreation}
                        onChange={(val) => handleSettingChange('pollCreation', val)}
                        disabled={!automationSettings.enabled || saving}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Zap size={18} className="text-orange-500" />
                        <div>
                          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Streak Alerts</p>
                          <p className="text-xs text-zinc-500">Notify on streak milestones</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        enabled={automationSettings.streakAlerts}
                        onChange={(val) => handleSettingChange('streakAlerts', val)}
                        disabled={!automationSettings.enabled || saving}
                      />
                    </div>
                  </div>
                  
                  {/* Reminder Time */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Daily Reminder Time (IST)</label>
                    <div className="flex items-center gap-3">
                      <Clock size={18} className="text-zinc-400" />
                      <input
                        type="time"
                        value={automationSettings.reminderTime}
                        onChange={(e) => handleSettingChange('reminderTime', e.target.value)}
                        disabled={!automationSettings.enabled || !automationSettings.dailyReminder || saving}
                        className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
              
              {/* Quick Actions - Admin Only */}
              {isAdmin && (
                <SectionCard
                  id="actions"
                  title="Quick Actions"
                  icon={Zap}
                  badge={`${quickActionsRef.current.length} available`}
                  badgeColor="blue"
                  isExpanded={expandedSection === 'actions'}
                  onToggle={toggleSection}
                >
                  <div className="pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {quickActionsRef.current.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleQuickAction(action.action)}
                          disabled={saving || status.status !== 'connected'}
                          className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all">
                            <action.icon size={20} className="text-green-600 group-hover:text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{action.label}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{action.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              )}
              
              {/* Test Message - Extracted to separate component */}
              <TestMessageSection
                isConnected={status.status === 'connected'}
                isAdmin={isAdmin}
                onSend={handleSendTestMessage}
              />
              
              {/* Notifications */}
              <SectionCard
                id="notifications"
                title="Notifications"
                icon={Bell}
                isExpanded={expandedSection === 'notifications'}
                onToggle={toggleSection}
              >
                <div className="pt-4 space-y-3">
                  {[
                    { key: 'onConnect', label: 'Connection alerts', desc: 'Notify when WhatsApp connects/disconnects' },
                    { key: 'onMessageReceived', label: 'Message alerts', desc: 'Notify when users respond' },
                    { key: 'onScheduleMissed', label: 'Missed schedules', desc: 'Alert when scheduled jobs fail' }
                  ].map((notif) => (
                    <div key={notif.key} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <div>
                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{notif.label}</p>
                        <p className="text-xs text-zinc-500">{notif.desc}</p>
                      </div>
                      <ToggleSwitch
                        enabled={notificationPrefs[notif.key as keyof typeof notificationPrefs]}
                        onChange={(val) => setNotificationPrefs(prev => ({ ...prev, [notif.key]: val }))}
                        color="blue"
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
              
              {/* Error Display */}
              {status.status === 'disconnected' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-red-700 dark:text-red-400">WhatsApp Not Connected</h4>
                      <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                        Please ask the admin to connect WhatsApp Web to enable automation features.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="sticky bottom-0 bg-zinc-50 dark:bg-zinc-800/50 p-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <p>WhatsApp Automation v1.0</p>
              <p>{formatDate(timeRef.current.dateString)} • {formatTime(timeRef.current.timeString)} IST</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Memoize the component with deep comparison
export default memo(WhatsAppAutomationDashboardComponent, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});