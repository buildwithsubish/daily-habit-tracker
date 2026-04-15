'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  QrCode, 
  Send, 
  Users, 
  Settings, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Radio,
  Activity,
  Shield,
  Zap,
  Building2,
  Smartphone,
  Mail,
  ChevronRight,
  Loader2,
  X,
  Download,
  Share2,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWhatsApp } from '@/contexts/WhatsAppStatusContext';

interface WhatsAppStatus {
  status: string;
  phoneNumber?: string;
  qrCode?: string;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  failureReason?: string;
  hasSavedSession?: boolean;
  message?: string;
}

interface BroadcastStats {
  totalUsers: number;
  verifiedUsers: number;
  automationEnabled: number;
  messagesSentToday: number;
  messagesRespondedToday: number;
}

interface MessageQueue {
  id: string;
  user: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp: string;
}

interface ConnectionLog {
  id: string;
  action: string;
  timestamp: string;
  details: string;
}

export default function WhatsAppAdminPage() {
  const { status, schedulerStatus, loading, refreshStatus, refreshSchedulerStatus } = useWhatsApp();
  const [initializing, setInitializing] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'all' | 'verified' | 'automation' | 'selected'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stats, setStats] = useState<BroadcastStats>({ 
    totalUsers: 0, 
    verifiedUsers: 0, 
    automationEnabled: 0,
    messagesSentToday: 0,
    messagesRespondedToday: 0
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'broadcast' | 'scheduler' | 'logs'>('dashboard');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [messageQueue, setMessageQueue] = useState<MessageQueue[]>([]);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
  const [headlessMode, setHeadlessMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Phone login state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [phoneLoginLoading, setPhoneLoginLoading] = useState(false);
  const [phoneLoginCode, setPhoneLoginCode] = useState<string | null>(null);
  const [phoneLoginError, setPhoneLoginError] = useState<string | null>(null);
  const [phoneLoginModalOpen, setPhoneLoginModalOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          verifiedUsers: data.whatsappVerifiedUsers || 0,
          automationEnabled: data.whatsappAutomationUsers || 0,
          messagesSentToday: data.messagesSentToday || 0,
          messagesRespondedToday: data.messagesRespondedToday || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    // Only fetch stats periodically, status is handled by context
    const statsInterval = setInterval(fetchStats, 60000); // Every minute
    return () => clearInterval(statsInterval);
  }, [fetchStats]);

  // Update current time every second for IST display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle QR modal based on status changes from context
  useEffect(() => {
    console.log('[WhatsApp Frontend] Status:', status.status, 'QR:', status.qrCode ? 'yes' : 'no', 'ModalOpen:', qrModalOpen);
    
    // Auto-open QR modal when connecting with QR code
    if (status.status === 'connecting' && status.qrCode) {
      console.log('[WhatsApp Frontend] Opening QR modal');
      setQrModalOpen(true);
    }
    
    // Close modal when connected
    if (status.status === 'connected') {
      setQrModalOpen(false);
    }
    
    // Show saved session message
    if (status.hasSavedSession && status.status === 'disconnected') {
      setConnectionLogs(prev => [{
        id: Date.now().toString(),
        action: 'saved_session',
        timestamp: new Date().toISOString(),
        details: `Saved session found for ${status.phoneNumber || 'unknown number'}`
      }, ...prev.slice(0, 49)]);
    }
    
    setConnectionLogs(prev => [
      {
        id: Date.now().toString(),
        action: 'status_check',
        timestamp: new Date().toISOString(),
        details: `Status: ${status.status}${status.phoneNumber ? ` (${status.phoneNumber})` : ''}`
      },
      ...prev.slice(0, 49)
    ]);
  }, [status, qrModalOpen]);

  const handleSchedulerToggle = async (action: 'start_scheduler' | 'stop_scheduler') => {
    try {
      const res = await fetch('/api/admin/whatsapp/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        refreshSchedulerStatus();
      } else {
        toast.error(data.error || 'Failed to toggle scheduler');
      }
    } catch (error) {
      toast.error('Failed to toggle scheduler');
    }
  };

  const handleManualAction = async (action: string) => {
    try {
      const res = await fetch('/api/admin/whatsapp/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Action completed');
        refreshSchedulerStatus();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      // Use auto_connect which loads existing session if available
      const res = await fetch('/api/admin/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_connect' }),
      });

      const data = await res.json();
      console.log('[WhatsApp] Init response:', data);
      
      if (data.success) {
        toast.success(data.message || 'WhatsApp initialization started');
        setConnectionLogs(prev => [{
          id: Date.now().toString(),
          action: 'init_started',
          timestamp: new Date().toISOString(),
          details: data.message || 'WhatsApp client initialization started'
        }, ...prev.slice(0, 49)]);
        
        setTimeout(refreshStatus, 3000);
      } else {
        console.error('[WhatsApp] Init failed:', data.error);
        toast.error(data.error || 'Failed to initialize');
      }
    } catch (error) {
      console.error('[WhatsApp] Init error:', error);
      toast.error('Failed to initialize WhatsApp');
    } finally {
      setInitializing(false);
    }
  };

  const handleClearSession = async () => {
    if (!confirm('Are you sure you want to clear the WhatsApp session? This will require a new QR scan or phone login.')) {
      return;
    }
    
    try {
      // First disconnect
      await fetch('/api/admin/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      
      toast.success('WhatsApp session cleared');
      setConnectionLogs(prev => [{
        id: Date.now().toString(),
        action: 'session_cleared',
        timestamp: new Date().toISOString(),
        details: 'WhatsApp session cleared'
      }, ...prev.slice(0, 49)]);
      
      refreshStatus();
    } catch (error) {
      toast.error('Failed to clear session');
    }
  };

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setPhoneLoginLoading(true);
    setPhoneLoginError(null);
    setPhoneLoginCode(null);
    
    try {
      const fullPhone = countryCode + phoneNumber.replace(/^0/, '');
      
      const res = await fetch('/api/admin/whatsapp/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: fullPhone,
          country: 'India',
          session_timeout: 120,
        }),
      });

      const data = await res.json();
      
      if (res.status === 408) {
        // Request timeout - QR code screen didn't appear
        setPhoneLoginError('Login code screen did not appear. Please try again.');
        toast.error('⏱️ Timeout: Login code screen did not appear within 30 seconds');
        setConnectionLogs(prev => [{
          id: Date.now().toString(),
          action: 'phone_login_timeout',
          timestamp: new Date().toISOString(),
          details: `Phone login timeout for ${fullPhone}`
        }, ...prev.slice(0, 49)]);
      } else if (res.status === 400) {
        // Bad request - phone login failed
        setPhoneLoginError(data.error || 'Phone login failed');
        toast.error(data.error || 'Phone login failed');
        setConnectionLogs(prev => [{
          id: Date.now().toString(),
          action: 'phone_login_failed',
          timestamp: new Date().toISOString(),
          details: `Phone login failed: ${data.error || 'Unknown error'}`
        }, ...prev.slice(0, 49)]);
      } else if (res.status === 500) {
        // Server error
        setPhoneLoginError('Server error during initialization');
        toast.error('❌ Failed to initialize WhatsApp browser');
      } else if (res.status === 200 || data.success) {
        // Success
        if (data.login_code) {
          setPhoneLoginCode(data.login_code);
          setPhoneLoginModalOpen(true);
          toast.success('✅ Login code generated! Enter it on your phone.');
          setConnectionLogs(prev => [{
            id: Date.now().toString(),
            action: 'phone_login_code',
            timestamp: new Date().toISOString(),
            details: `Phone login code: ${data.login_code}`
          }, ...prev.slice(0, 49)]);
        } else if (data.status === 'connected') {
          toast.success('✅ WhatsApp connected via phone login!');
          setConnectionLogs(prev => [{
            id: Date.now().toString(),
            action: 'phone_login_connected',
            timestamp: new Date().toISOString(),
            details: `Connected via phone: ${fullPhone}`
          }, ...prev.slice(0, 49)]);
          refreshStatus();
        } else {
          toast.success('Phone login process started');
        }
      } else {
        setPhoneLoginError(data.error || 'Phone login failed');
        toast.error(data.error || 'Phone login failed');
      }
    } catch (error) {
      const errorMsg = 'Failed to initiate phone login';
      setPhoneLoginError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setPhoneLoginLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_qr' }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('QR code regenerated');
        setQrModalOpen(true);
        setConnectionLogs(prev => [{
          id: Date.now().toString(),
          action: 'qr_regenerated',
          timestamp: new Date().toISOString(),
          details: 'New QR code generated'
        }, ...prev.slice(0, 49)]);
        
        setTimeout(refreshStatus, 3000);
      } else {
        toast.error(data.error || 'Failed to regenerate QR');
      }
    } catch (error) {
      toast.error('Failed to regenerate QR');
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('WhatsApp disconnected');
        setConnectionLogs(prev => [{
          id: Date.now().toString(),
          action: 'disconnected',
          timestamp: new Date().toISOString(),
          details: 'WhatsApp client manually disconnected'
        }, ...prev.slice(0, 49)]);
        
        refreshStatus();
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setBroadcastSending(true);
    try {
      const body: any = { 
        message: broadcastMessage,
      };

      if (broadcastType === 'selected' && selectedUsers.length > 0) {
        body.userIds = selectedUsers;
      } else if (broadcastType === 'verified') {
        body.filter = { whatsappVerified: true };
      } else if (broadcastType === 'automation') {
        body.filter = { whatsappAutomation: true };
      } else {
        body.filter = { whatsappVerified: true };
      }

      const res = await fetch('/api/admin/whatsapp/broadcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Message sent to ${data.results?.messagesSent || 0} users`);
        setBroadcastMessage('');
        
        setMessageQueue(prev => [
          {
            id: Date.now().toString(),
            user: 'Broadcast',
            message: broadcastMessage.substring(0, 50) + '...',
            status: 'sent',
            timestamp: new Date().toISOString()
          },
          ...prev.slice(0, 9)
        ]);
        
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to send broadcast');
      }
    } catch (error) {
      toast.error('Failed to send broadcast');
    } finally {
      setBroadcastSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'broadcast', label: 'Broadcast', icon: Send },
    { id: 'scheduler', label: 'Scheduler', icon: Clock },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
  ];

  const handleDownloadQR = () => {
    if (!status.qrCode) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${status.qrCode}`;
    link.download = `whatsapp-qr-${new Date().toISOString().slice(0,10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  const handleSendQRToMe = async () => {
    if (!status.qrCode) return;
    toast.error('Please configure your WhatsApp number in settings first');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AnimatePresence>
        {qrModalOpen && status.qrCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setQrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Scan QR Code</h3>
                    <p className="text-sm text-gray-500">Connect your WhatsApp</p>
                  </div>
                </div>
                <button
                  onClick={() => setQrModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center mb-6">
                {status.qrCode && status.qrCode.startsWith('iVBOR') ? (
                  <img 
                    src={`data:image/png;base64,${status.qrCode}`}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64"
                  />
                ) : (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(status.qrCode || '')}`}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64"
                  />
                )}
              </div>
              
              <p className="text-center text-sm text-gray-600 mb-4">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
              
              <div className="flex gap-3 mb-3">
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleSendQRToMe}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Send to Me
                </button>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleRegenerateQR}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    setQrModalOpen(false);
                    refreshStatus();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  I&apos;ve Connected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phone Login Modal */}
      <AnimatePresence>
        {phoneLoginModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setPhoneLoginModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Enter Login Code</h3>
                    <p className="text-sm text-gray-500">WhatsApp Web Phone Login</p>
                  </div>
                </div>
                <button
                  onClick={() => setPhoneLoginModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {phoneLoginCode && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
                  <p className="text-center text-sm text-purple-600 mb-3">Your 8-character login code:</p>
                  <div className="flex justify-center gap-2 mb-4">
                    {phoneLoginCode.split('').map((char, idx) => (
                      <div key={idx} className="w-10 h-12 bg-white rounded-lg border-2 border-purple-300 flex items-center justify-center text-2xl font-bold text-purple-700">
                        {char}
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-purple-500">
                    Enter this code on your WhatsApp mobile app
                  </p>
                </div>
              )}
              
              <p className="text-center text-sm text-gray-600 mb-4">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPhoneLoginModalOpen(false);
                    refreshStatus();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  I&apos;ve Connected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Automation</h1>
              <p className="text-gray-500">Manage your WhatsApp messaging hub</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusBadge(status.status)}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status.status)} ${status.status === 'connecting' ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium capitalize">{status.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-sm text-gray-500">Registered Users</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Verified</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.verifiedUsers}</p>
            <p className="text-sm text-gray-500">WhatsApp Verified</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.automationEnabled}</p>
            <p className="text-sm text-gray-500">Automation Enabled</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.messagesSentToday}</p>
            <p className="text-sm text-gray-500">Messages Sent</p>
          </motion.div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'dashboard' | 'broadcast' | 'scheduler' | 'logs')}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h3>
                  
                  {status.status === 'connected' && status.phoneNumber && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">Connected</span>
                      </div>
                      <p className="text-sm text-green-600">+{status.phoneNumber}</p>
                      {status.lastConnectedAt && (
                        <p className="text-xs text-green-500 mt-2">
                          Connected since: {new Date(status.lastConnectedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {status.status === 'connecting' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                        <span className="font-medium text-yellow-700">Connecting...</span>
                      </div>
                    </div>
                  )}

                  {status.status === 'failed' && status.failureReason && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-700">Connection Failed</span>
                      </div>
                      <p className="text-sm text-red-600 mt-2">{status.failureReason}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {status.status === 'disconnected' && status.hasSavedSession && (
                      <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-700">Saved Session Found</p>
                            <p className="text-sm text-blue-600">
                              {status.phoneNumber ? `Previously connected to +${status.phoneNumber}` : 'Click below to reconnect'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {status.status === 'disconnected' && !status.hasSavedSession && (
                      <button
                        onClick={handleInitialize}
                        disabled={initializing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {initializing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <QrCode className="w-4 h-4" />
                        )}
                        {initializing ? 'Connecting...' : 'Connect WhatsApp'}
                      </button>
                    )}

                    {status.status === 'disconnected' && status.hasSavedSession && (
                      <button
                        onClick={handleInitialize}
                        disabled={initializing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {initializing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <QrCode className="w-4 h-4" />
                        )}
                        {initializing ? 'Reconnecting...' : 'Reconnect WhatsApp'}
                      </button>
                    )}

                    {status.status === 'connected' && (
                      <>
                        <button
                          onClick={handleRegenerateQR}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          Re-scan QR
                        </button>
                        <button
                          onClick={handleDisconnect}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Disconnect
                        </button>
                      </>
                    )}

                    {/* Clear Session - shown when disconnected or failed */}
                    {(status.status === 'disconnected' || status.status === 'failed') && (
                      <button
                        onClick={handleClearSession}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 disabled:opacity-50 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Saved Session
                      </button>
                    )}

                    {status.status === 'connecting' && (
                      <button
                        onClick={refreshStatus}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Check Status
                      </button>
                    )}
                  </div>

                  {/* Phone Login Section */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-600" />
                      Phone Login Alternative
                    </h4>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="91">+91 (India)</option>
                          <option value="1">+1 (US)</option>
                          <option value="44">+44 (UK)</option>
                          <option value="971">+971 (UAE)</option>
                        </select>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Phone number"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <button
                        onClick={handlePhoneLogin}
                        disabled={phoneLoginLoading || !phoneNumber.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {phoneLoginLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Smartphone className="w-4 h-4" />
                        )}
                        {phoneLoginLoading ? 'Starting...' : 'Login with Phone'}
                      </button>
                      {phoneLoginError && (
                        <p className="text-xs text-red-500">{phoneLoginError}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                      <span className="text-gray-600">Response Rate</span>
                      <span className="font-semibold text-gray-900">
                        {stats.messagesSentToday > 0 
                          ? Math.round((stats.messagesRespondedToday / stats.messagesSentToday) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                      <span className="text-gray-600">Verification Rate</span>
                      <span className="font-semibold text-gray-900">
                        {stats.totalUsers > 0 
                          ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                      <span className="text-gray-600">Automation Adoption</span>
                      <span className="font-semibold text-gray-900">
                        {stats.verifiedUsers > 0 
                          ? Math.round((stats.automationEnabled / stats.verifiedUsers) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'broadcast' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Send Broadcast Message</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Send a message to your WhatsApp users
                </p>
                
                <div className="space-y-4">
                  {/* Broadcast Type Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Recipients
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => setBroadcastType('all')}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          broadcastType === 'all' 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        All Users
                        <span className="block text-xs opacity-70">{stats.totalUsers}</span>
                      </button>
                      <button
                        onClick={() => setBroadcastType('verified')}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          broadcastType === 'verified' 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        Verified
                        <span className="block text-xs opacity-70">{stats.verifiedUsers}</span>
                      </button>
                      <button
                        onClick={() => setBroadcastType('automation')}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          broadcastType === 'automation' 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        Automation
                        <span className="block text-xs opacity-70">{stats.automationEnabled}</span>
                      </button>
                      <button
                        onClick={() => setBroadcastType('selected')}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          broadcastType === 'selected' 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        Selected
                        <span className="block text-xs opacity-70">{selectedUsers.length} users</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Content
                    </label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Enter your broadcast message..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {broadcastMessage.length} characters
                    </span>
                    <button
                      onClick={handleBroadcast}
                      disabled={broadcastSending || !broadcastMessage.trim() || status.status !== 'connected'}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {broadcastSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {broadcastSending ? 'Sending...' : 'Send Broadcast'}
                    </button>
                  </div>
                </div>

                {messageQueue.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Recent Messages</h4>
                    <div className="space-y-2">
                      {messageQueue.map((msg) => (
                        <div key={msg.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className={`w-2 h-2 rounded-full ${
                            msg.status === 'sent' ? 'bg-green-500' : 
                            msg.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.message}</p>
                            <p className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            msg.status === 'sent' ? 'bg-green-100 text-green-700' : 
                            msg.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {msg.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'scheduler' && (
              <div className="space-y-6">
                {/* Scheduler Status Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">WhatsApp Automation Scheduler</h3>
                      <p className="text-sm text-gray-500 mt-1">Manage automated messaging schedules</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        schedulerStatus.running 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {schedulerStatus.running ? 'Running' : 'Stopped'}
                      </div>
                      <button
                        onClick={() => handleSchedulerToggle(schedulerStatus.running ? 'stop_scheduler' : 'start_scheduler')}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                          schedulerStatus.running
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50`}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : schedulerStatus.running ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {schedulerStatus.running ? 'Stop' : 'Start'} Scheduler
                      </button>
                    </div>
                  </div>

                  {/* Current Time - IST */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Current Time (IST)</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {currentTime.toLocaleTimeString('en-IN', { 
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {currentTime.toLocaleDateString('en-IN', { 
                            timeZone: 'Asia/Kolkata',
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Jobs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium text-gray-900">Daily Messages</span>
                      </div>
                      <p className="text-sm text-gray-500">Every hour</p>
                      <p className="text-xs text-gray-400 mt-1">Sends daily habit summaries</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="font-medium text-gray-900">Reminders</span>
                      </div>
                      <p className="text-sm text-gray-500">Every 15 minutes</p>
                      <p className="text-xs text-gray-400 mt-1">Sends reminder messages</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="font-medium text-gray-900">Polls</span>
                      </div>
                      <p className="text-sm text-gray-500">Daily at 8:00 AM</p>
                      <p className="text-xs text-gray-400 mt-1">Creates daily polls</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-gray-900">Poll Results</span>
                      </div>
                      <p className="text-sm text-gray-500">Daily at 8:00 PM</p>
                      <p className="text-xs text-gray-400 mt-1">Checks poll results</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="font-medium text-gray-900">Weekly Reports</span>
                      </div>
                      <p className="text-sm text-gray-500">Every Sunday at 9:00 AM</p>
                      <p className="text-xs text-gray-400 mt-1">Sends weekly summaries</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="font-medium text-gray-900">Inactivity Check</span>
                      </div>
                      <p className="text-sm text-gray-500">Daily at 6:00 PM</p>
                      <p className="text-xs text-gray-400 mt-1">Checks inactive users</p>
                    </div>
                  </div>
                </div>

                {/* Manual Actions */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleManualAction('send_daily_messages')}
                      disabled={loading || status.status !== 'connected'}
                      className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Send Daily</span>
                    </button>
                    <button
                      onClick={() => handleManualAction('process_reminders')}
                      disabled={loading || status.status !== 'connected'}
                      className="flex flex-col items-center gap-2 p-4 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors disabled:opacity-50"
                    >
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">Send Reminders</span>
                    </button>
                    <button
                      onClick={() => handleManualAction('process_all_polls')}
                      disabled={loading || status.status !== 'connected'}
                      className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Create Polls</span>
                    </button>
                    <button
                      onClick={() => handleManualAction('check_pending_polls')}
                      disabled={loading || status.status !== 'connected'}
                      className="flex flex-col items-center gap-2 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      <Activity className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-700">Check Polls</span>
                    </button>
                    <button
                      onClick={() => handleManualAction('send_weekly_reports')}
                      disabled={loading || status.status !== 'connected'}
                      className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors disabled:opacity-50"
                    >
                      <Mail className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">Weekly Report</span>
                    </button>
                    <button
                      onClick={() => handleManualAction('check_inactivity')}
                      disabled={loading || status.status !== 'connected'}
                      className="flex flex-col items-center gap-2 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Check Inactivity</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Connection Logs</h3>
                  <button
                    onClick={refreshStatus}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {connectionLogs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No logs yet</p>
                  ) : (
                    connectionLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{log.details}</p>
                          <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
