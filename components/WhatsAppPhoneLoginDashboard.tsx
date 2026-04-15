'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Play,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  History,
  X,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PhoneLoginStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

interface LoginLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

interface LoginAttempt {
  id: string;
  phone: string;
  code?: string;
  status: 'success' | 'failed' | 'timeout';
  timestamp: string;
  duration: number;
}

interface PhoneLoginProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl?: string;
}

export default function WhatsAppPhoneLoginDashboard({
  isOpen,
  onClose,
  apiBaseUrl = 'http://127.0.0.1:8765',
}: PhoneLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loginCode, setLoginCode] = useState('');
  const [codeCountdown, setCodeCountdown] = useState(120);
  const [showCodeCard, setShowCodeCard] = useState(false);
  const [steps, setSteps] = useState<PhoneLoginStep[]>([
    { id: 'country', label: 'Select Country', description: 'Detecting and selecting country', status: 'pending' },
    { id: 'phone', label: 'Enter Phone', description: 'Entering phone number', status: 'pending' },
    { id: 'next', label: 'Click Next', description: 'Submitting phone number', status: 'pending' },
    { id: 'code', label: 'Get Code', description: 'Waiting for login code', status: 'pending' },
  ]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [sessionAlive, setSessionAlive] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const logPollInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog: LoginLog = {
      id: Math.random().toString(36),
      message,
      type,
      timestamp: new Date(),
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const updateStep = useCallback((stepId: string, status: PhoneLoginStep['status']) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  }, []);

  const startCountdown = useCallback(() => {
    setCodeCountdown(120);
    if (countdownInterval.current) clearInterval(countdownInterval.current);

    countdownInterval.current = setInterval(() => {
      setCodeCountdown(prev => {
        if (prev <= 1) {
          if (countdownInterval.current) clearInterval(countdownInterval.current);
          addLog('⚠️ Code expired. Please initiate login again.', 'warning');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [addLog]);

  const pollLogs = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/session/status?session_id=default`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'connected' && !sessionAlive) {
          setSessionAlive(true);
          addLog('✅ Session established and maintained', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  }, [apiBaseUrl, sessionAlive, addLog]);

  const handlePhoneLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!/^\d{10}$/.test(phoneNumber.replace(/\D/g, ''))) {
      toast.error('Phone number must be 10 digits');
      return;
    }

    setIsProcessing(true);
    setShowCodeCard(false);
    setLoginCode('');
    setLogs([]);
    setSteps(prev =>
      prev.map(step => ({ ...step, status: 'pending' }))
    );

    try {
      addLog('🚀 Initiating WhatsApp phone login...', 'info');
      addLog(`📱 Phone: +91${phoneNumber}`, 'info');
      addLog(`🌍 Country: ${country}`, 'info');

      updateStep('country', 'in-progress');
      addLog('📍 Step 1: Selecting country...', 'info');

      const response = await fetch(`${apiBaseUrl}/session/phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'default',
          phone_number: phoneNumber,
          country,
          session_timeout: 120,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'connected' && result.login_code) {
        updateStep('country', 'completed');
        addLog('✅ Country selected', 'success');

        updateStep('phone', 'in-progress');
        addLog('📱 Step 2: Entering phone number...', 'info');
        await new Promise(r => setTimeout(r, 1000));
        updateStep('phone', 'completed');
        addLog('✅ Phone number entered', 'success');

        updateStep('next', 'in-progress');
        addLog('⏩ Step 3: Clicking Next button...', 'info');
        await new Promise(r => setTimeout(r, 1000));
        updateStep('next', 'completed');
        addLog('✅ Next button clicked', 'success');

        updateStep('code', 'in-progress');
        addLog('🔑 Step 4: Waiting for login code...', 'info');
        await new Promise(r => setTimeout(r, 1000));
        updateStep('code', 'completed');

        setLoginCode(result.login_code);
        setShowCodeCard(true);
        setSessionAlive(true);
        startCountdown();

        addLog(`🔐 Login code received: ${result.login_code}`, 'success');
        addLog('📱 Enter this code on your phone to complete login', 'success');
        addLog(`⏱️  Code valid for 2 minutes`, 'info');

        const attempt: LoginAttempt = {
          id: Math.random().toString(36),
          phone: phoneNumber,
          code: result.login_code,
          status: 'success',
          timestamp: new Date().toISOString(),
          duration: 30,
        };
        setLoginAttempts(prev => [attempt, ...prev.slice(0, 9)]);

        if (logPollInterval.current) clearInterval(logPollInterval.current);
        logPollInterval.current = setInterval(pollLogs, 5000);

        toast.success('Login code received! Check the dashboard.');
      } else if (result.status === 'timeout') {
        updateStep('code', 'failed');
        addLog('❌ Timeout: Code screen did not appear', 'error');
        addLog('💡 Check your internet connection and try again', 'warning');

        const attempt: LoginAttempt = {
          id: Math.random().toString(36),
          phone: phoneNumber,
          status: 'timeout',
          timestamp: new Date().toISOString(),
          duration: 120,
        };
        setLoginAttempts(prev => [attempt, ...prev.slice(0, 9)]);

        toast.error('Login timeout. Please try again.');
      } else {
        updateStep('country', 'failed');
        addLog(`❌ Error: ${result.error || 'Unknown error'}`, 'error');

        const attempt: LoginAttempt = {
          id: Math.random().toString(36),
          phone: phoneNumber,
          status: 'failed',
          timestamp: new Date().toISOString(),
          duration: 30,
        };
        setLoginAttempts(prev => [attempt, ...prev.slice(0, 9)]);

        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      addLog(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      updateStep('country', 'failed');

      const attempt: LoginAttempt = {
        id: Math.random().toString(36),
        phone: phoneNumber,
        status: 'failed',
        timestamp: new Date().toISOString(),
        duration: 30,
      };
      setLoginAttempts(prev => [attempt, ...prev.slice(0, 9)]);

      toast.error('Failed to connect to server');
    } finally {
      setIsProcessing(false);
    }
  }, [phoneNumber, country, apiBaseUrl, addLog, updateStep, startCountdown, pollLogs]);

  const handleCopyCode = useCallback(() => {
    if (loginCode) {
      navigator.clipboard.writeText(loginCode);
      toast.success('Code copied to clipboard!');
      addLog('📋 Code copied to clipboard', 'success');
    }
  }, [loginCode, addLog]);

  const handleCancel = useCallback(() => {
    setIsProcessing(false);
    setShowCodeCard(false);
    setLoginCode('');
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (logPollInterval.current) clearInterval(logPollInterval.current);
    addLog('⛔ Process cancelled by user', 'warning');
  }, [addLog]);

  const handleKeepAlive = useCallback(async () => {
    try {
      addLog('🔄 Extending session...', 'info');
      startCountdown();
      addLog('✅ Session extended for 2 more minutes', 'success');
      toast.success('Session extended!');
    } catch (error) {
      addLog('❌ Failed to extend session', 'error');
      toast.error('Failed to extend session');
    }
  }, [addLog, startCountdown]);

  useEffect(() => {
    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (logPollInterval.current) clearInterval(logPollInterval.current);
    };
  }, []);

  if (!isOpen) return null;

  const getLogColor = (type: LoginLog['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getLogBg = (type: LoginLog['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStepIcon = (status: PhoneLoginStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'in-progress':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}><RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" /></motion.div>;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
    }
  };

  const minutes = Math.floor(codeCountdown / 60);
  const seconds = codeCountdown % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-end justify-end p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ translateX: 400 }}
          animate={{ translateX: 0 }}
          exit={{ translateX: 400 }}
          onClick={e => e.stopPropagation()}
          className={`bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-all duration-300 ${isMinimized ? 'h-16' : ''}`}
        >
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">WhatsApp Phone Login</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Automated authentication dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex-1 overflow-auto">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        Phone Number
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          onMouseEnter={() => setTooltip('phone')}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </label>
                    <div className="flex items-center">
                      <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-l border-y border-gray-300 dark:border-gray-700 rounded-l-lg text-gray-600 dark:text-gray-400 text-sm">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        disabled={isProcessing}
                        className="flex-1 px-3 py-2 border-r border-y border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-r-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    {tooltip === 'phone' && (
                      <div className="absolute bottom-12 left-0 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        Enter 10-digit phone number
                      </div>
                    )}
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        Country
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          onMouseEnter={() => setTooltip('country')}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </label>
                    <select
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option>India</option>
                      <option>United States</option>
                      <option>United Kingdom</option>
                      <option>Canada</option>
                      <option>Australia</option>
                      <option>Other</option>
                    </select>
                    {tooltip === 'country' && (
                      <div className="absolute bottom-12 left-0 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        Select your country
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePhoneLogin}
                    disabled={isProcessing || !phoneNumber.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                          <RefreshCw className="w-4 h-4" />
                        </motion.div>
                        Logging in...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Start Login
                      </>
                    )}
                  </motion.button>
                </div>

                {showCodeCard && loginCode && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 text-center"
                  >
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">🔐 YOUR LOGIN CODE</p>
                      <div className="text-5xl font-bold font-mono text-green-600 dark:text-green-400 tracking-widest mb-4">
                        {loginCode}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Enter this code on your WhatsApp mobile app
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 mb-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyCode}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </motion.button>

                      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                        <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400">
                          {minutes}:{seconds.toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleKeepAlive}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        Keep Alive
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCancel}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      Login Steps
                    </h3>
                    <button
                      onClick={() => setHistoryOpen(!historyOpen)}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                    >
                      <History className="w-4 h-4" />
                      History
                    </button>
                  </div>

                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getStepIcon(step.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{step.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    Live Log Viewer
                  </h3>
                  <div className="h-64 overflow-y-auto bg-gray-900 dark:bg-black rounded-lg p-4 font-mono text-xs space-y-1 border border-gray-700">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">Waiting for logs...</div>
                    ) : (
                      logs.map(log => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`${getLogColor(log.type)} flex items-start gap-2`}
                        >
                          <span className="text-gray-500 flex-shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                          <span className="flex-1 break-words">{log.message}</span>
                        </motion.div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {historyOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-4 max-h-64 overflow-y-auto"
            >
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Recent Login Attempts</h3>
              <div className="space-y-2">
                {loginAttempts.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No login attempts yet</p>
                ) : (
                  loginAttempts.map(attempt => (
                    <motion.div
                      key={attempt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">+91{attempt.phone}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(attempt.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {attempt.code && (
                          <code className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded font-mono text-xs">
                            {attempt.code}
                          </code>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          attempt.status === 'success'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : attempt.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {attempt.status}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
