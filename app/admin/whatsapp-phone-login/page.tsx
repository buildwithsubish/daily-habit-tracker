'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone,
  QrCode,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Settings,
  Zap,
  TrendingUp,
  ChevronRight,
  Shield,
  Gauge,
  Radio
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import WhatsAppPhoneLoginDashboard from '@/components/WhatsAppPhoneLoginDashboard';

interface PhoneLoginStats {
  totalAttempts: number;
  successfulLogins: number;
  failedAttempts: number;
  avgLoginTime: number;
  currentSessionStatus: 'connected' | 'disconnected' | 'connecting';
  lastLoginTime?: string;
}

interface ServerHealthStatus {
  isRunning: boolean;
  uptime: number;
  lastChecked: string;
}

export default function WhatsAppPhoneLoginPage() {
  const [isPhoneLoginOpen, setIsPhoneLoginOpen] = useState(false);
  const [stats, setStats] = useState<PhoneLoginStats>({
    totalAttempts: 0,
    successfulLogins: 0,
    failedAttempts: 0,
    avgLoginTime: 0,
    currentSessionStatus: 'disconnected',
  });
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus>({
    isRunning: false,
    uptime: 0,
    lastChecked: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [autoCheckHealth, setAutoCheckHealth] = useState(true);

  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8765/health');
      if (response.ok) {
        const startTime = Date.now();
        setServerHealth({
          isRunning: true,
          uptime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
        });
        return true;
      } else {
        setServerHealth(prev => ({
          ...prev,
          isRunning: false,
          lastChecked: new Date().toISOString(),
        }));
        return false;
      }
    } catch (error) {
      setServerHealth(prev => ({
        ...prev,
        isRunning: false,
        lastChecked: new Date().toISOString(),
      }));
      return false;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8765/session/status?session_id=default');
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          currentSessionStatus: data.status || 'disconnected',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await checkServerHealth();
      await fetchStats();
      setLoading(false);
    };

    initialize();

    if (autoCheckHealth) {
      const healthInterval = setInterval(() => {
        checkServerHealth();
        fetchStats();
      }, 10000);

      return () => clearInterval(healthInterval);
    }
  }, [autoCheckHealth, checkServerHealth, fetchStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Smartphone className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                WhatsApp Phone Login
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Streamlined phone number authentication for WhatsApp Web
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPhoneLoginOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-lg transition-all flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Open Login Dashboard
            </motion.button>
          </div>
        </motion.div>

        {/* Server Health Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className={`rounded-lg border-l-4 p-4 ${
            serverHealth.isRunning
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
              : 'bg-red-50 dark:bg-red-900/20 border-red-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {serverHealth.isRunning ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <p className={`font-semibold ${
                    serverHealth.isRunning
                      ? 'text-green-900 dark:text-green-300'
                      : 'text-red-900 dark:text-red-300'
                  }`}>
                    {serverHealth.isRunning ? 'Server is Online' : 'Server is Offline'}
                  </p>
                  <p className={`text-sm ${
                    serverHealth.isRunning
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    Last checked: {new Date(serverHealth.lastChecked).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ rotate: 180 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => checkServerHealth()}
                className={`p-2 rounded-lg transition-colors ${
                  serverHealth.isRunning
                    ? 'hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'hover:bg-red-100 dark:hover:bg-red-900/30'
                }`}
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
            </div>

            {!serverHealth.isRunning && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">
                  <strong>⚠️ Server Offline:</strong> The WhatsApp automation server is not running. Start it with:
                </p>
                <code className="block mt-2 p-2 bg-red-900 text-red-100 rounded font-mono text-xs">
                  python whatsapp_server.py
                </code>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={Radio}
            label="Session Status"
            value={stats.currentSessionStatus}
            status={stats.currentSessionStatus === 'connected' ? 'success' : 'warning'}
            subtext="Current connection"
          />
          <StatCard
            icon={CheckCircle}
            label="Successful Logins"
            value={stats.successfulLogins}
            status="success"
            subtext="This session"
          />
          <StatCard
            icon={XCircle}
            label="Failed Attempts"
            value={stats.failedAttempts}
            status={stats.failedAttempts > 0 ? 'error' : 'success'}
            subtext="Requires review"
          />
          <StatCard
            icon={Clock}
            label="Avg Login Time"
            value={`${stats.avgLoginTime}s`}
            status="info"
            subtext="Average duration"
          />
        </motion.div>

        {/* Quick Start Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Start Guide</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Click "Open Login Dashboard"</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Launch the phone login automation interface
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Enter Phone Number</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Provide 10-digit phone number without country code
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Click "Start Login"</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Initiate the automated authentication flow
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">View 8-Character Code</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Large, bold code displayed in prominent card with countdown
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold">
                    5
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Enter on Mobile</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Use copy button or manually enter code on WhatsApp mobile app
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold">
                    6
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Maintain Session</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Use "Keep Alive" to extend browser session as needed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <FeatureCard
            icon={Smartphone}
            title="Phone Number Input"
            description="Automatic country code detection (+91) with validation"
          />
          <FeatureCard
            icon={Zap}
            title="Instant Code Display"
            description="8-character code in large, bold card with copy button"
          />
          <FeatureCard
            icon={Clock}
            title="Countdown Timer"
            description="Visual timer showing remaining time to enter code"
          />
          <FeatureCard
            icon={CheckCircle}
            title="Step Progress"
            description="Visual indicators for each login step completion"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Real-time Logs"
            description="Color-coded status messages streaming live updates"
          />
          <FeatureCard
            icon={History}
            title="Login History"
            description="Recent attempts with timestamps and codes stored"
          />
        </motion.div>
      </div>

      {/* Phone Login Dashboard Modal */}
      <WhatsAppPhoneLoginDashboard
        isOpen={isPhoneLoginOpen}
        onClose={() => setIsPhoneLoginOpen(false)}
        apiBaseUrl="http://127.0.0.1:8765"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  status: 'success' | 'error' | 'warning' | 'info';
  subtext: string;
}

function StatCard({ icon: Icon, label, value, status, subtext }: StatCardProps) {
  const bgColor = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  const textColor = {
    success: 'text-green-700 dark:text-green-300',
    error: 'text-red-700 dark:text-red-300',
    warning: 'text-yellow-700 dark:text-yellow-300',
    info: 'text-blue-700 dark:text-blue-300',
  };

  const iconBgColor = {
    success: 'bg-green-100 dark:bg-green-900/30',
    error: 'bg-red-100 dark:bg-red-900/30',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30',
    info: 'bg-blue-100 dark:bg-blue-900/30',
  };

  const iconColor = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`rounded-lg border p-4 ${bgColor[status]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`text-2xl font-bold mt-2 ${textColor[status]}`}>{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor[status]}`}>
          <Icon className={`w-5 h-5 ${iconColor[status]}`} />
        </div>
      </div>
    </motion.div>
  );
}

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
          <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">{description}</p>
    </motion.div>
  );
}

import { History } from 'lucide-react';
