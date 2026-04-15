'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Clock, CalendarDays, RefreshCw, Smartphone, Shield, CheckCircle2, Activity, Zap, Bell, Send } from 'lucide-react';
import { Habit } from '@/types';
import { toast } from 'react-hot-toast';

interface WhatsAppSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    habit: Habit;
    onSave: (habitId: string, settings: Partial<Habit>) => void;
}

export default function WhatsAppSettingsModal({ isOpen, onClose, habit, onSave }: WhatsAppSettingsModalProps) {
    const [enabled, setEnabled] = useState(habit.whatsappEnabled || false);
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'manual' | 'smart'>(habit.whatsappFrequency || 'manual');
    const [time, setTime] = useState(habit.whatsappTime || '08:00');
    const [saving, setSaving] = useState(false);
    
    // Current time in IST with stable layout
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeString, setTimeString] = useState('');

    // User profile state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [hasNumber, setHasNumber] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

    // Verification state
    const [verificationStep, setVerificationStep] = useState<'input' | 'verify'>('input');
    const [verificationCode, setVerificationCode] = useState('');
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [codeCountdown, setCodeCountdown] = useState(0);
    const [codeCountdownString, setCodeCountdownString] = useState('');

    // Update time every second with stable layout
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTimeString(now.toLocaleTimeString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    // Countdown timer for resend code with stable layout
    useEffect(() => {
        if (codeCountdown <= 0) {
            setCodeCountdownString('');
            return;
        }
        const timer = setTimeout(() => {
            const newCountdown = codeCountdown - 1;
            setCodeCountdown(newCountdown);
            setCodeCountdownString(newCountdown.toString());
        }, 1000);
        return () => clearTimeout(timer);
    }, [codeCountdown]);

    const fetchProfile = async () => {
        setLoadingProfile(true);
        try {
            const res = await fetch('/api/whatsapp');
            if (res.ok) {
                const data = await res.json();
                if (data.whatsappNumber) {
                    setPhoneNumber(data.whatsappNumber);
                    setHasNumber(true);
                }
                setIsVerified(data.whatsappVerified || false);
                setWhatsappStatus(data.whatsappAutomation ? 'connected' : 'disconnected');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProfile(false);
        }
    };

    const validatePhoneNumber = (phone: string): { valid: boolean; formatted: string; error?: string } => {
        const cleaned = phone.replace(/\D/g, '');
        
        if (!cleaned || cleaned.length < 10) {
            return { valid: false, formatted: '', error: 'Please enter at least 10 digits' };
        }
        
        if (cleaned.length > 15) {
            return { valid: false, formatted: '', error: 'Phone number is too long' };
        }
        
        let formatted = cleaned;
        if (!phone.includes('+') && cleaned.length === 10) {
            formatted = '+1' + cleaned;
        } else if (!phone.includes('+') && cleaned.length > 10) {
            formatted = '+' + cleaned;
        } else if (phone.includes('+')) {
            // Remove any duplicate + signs and ensure only one at the beginning
            const withoutExtraPlus = phone.replace(/\+/g, '');
            formatted = '+' + withoutExtraPlus.replace(/\D/g, '');
        }
        
        return { valid: true, formatted };
    };

    const handleSendVerificationCode = async () => {
        const validation = validatePhoneNumber(phoneNumber);
        if (!validation.valid) {
            toast.error(validation.error || 'Please enter a valid WhatsApp number');
            return;
        }

        const confirmPhone = window.confirm(`We will send a verification code to:\n\n${validation.formatted}\n\nIs this correct?`);
        if (!confirmPhone) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/whatsapp/verify-number', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: validation.formatted })
            });

            const data = await res.json();

            if (res.ok) {
                setVerificationStep('verify');
                setCodeCountdown(60);
                toast.success('Verification code sent to your WhatsApp!');
            } else {
                toast.error(data.error || 'Failed to send verification code');
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            toast.error('Failed to send verification code');
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode.trim()) {
            toast.error('Please enter the verification code');
            return;
        }

        setVerifyingCode(true);
        try {
            const res = await fetch('/api/whatsapp/verify-number', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verificationCode: verificationCode.trim() })
            });

            const data = await res.json();

            if (res.ok) {
                setIsVerified(true);
                setVerificationStep('input');
                setVerificationCode('');
                setCodeCountdown(0);
                toast.success('Phone number verified successfully!');
                // Refresh profile data to get updated verification state
                await fetchProfile();
            } else {
                toast.error(data.error || 'Invalid verification code');
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            toast.error('Failed to verify code');
        } finally {
            setVerifyingCode(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(habit.id, {
                whatsappEnabled: enabled,
                whatsappFrequency: frequency as any,
                whatsappTime: time,
            });
            toast.success('WhatsApp preferences saved!');
            onClose();
        } catch (error) {
            toast.error('Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveNumber = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/whatsapp/settings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            
            if (res.ok) {
                setPhoneNumber('');
                setHasNumber(false);
                setIsVerified(false);
                setEnabled(false);
                toast.success('WhatsApp number removed');
            }
        } catch (error) {
            console.error('Error removing number:', error);
            toast.error('Failed to remove number');
        } finally {
            setSaving(false);
        }
    };

    const frequencies = [
        { id: 'daily', label: 'Daily Delivery', icon: CalendarDays, desc: 'Receive checklist every day' },
        { id: 'weekly', label: 'Weekly Summary', icon: RefreshCw, desc: 'Get a recap at the end of the week' },
        { id: 'smart', label: 'Smart Auto-Send', icon: Smartphone, desc: 'Triggered right before you usually do it' },
        { id: 'manual', label: 'Manual Only', icon: MessageCircle, desc: 'Send from dashboard yourself' }
    ];

    const getStatusColor = () => {
        switch (whatsappStatus) {
            case 'connected': return 'bg-green-500';
            case 'connecting': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden"
                    style={{ minHeight: '400px', maxHeight: '85vh' }}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <MessageCircle className="text-green-500 w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">WhatsApp Automation</h3>
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Configure for: <span className="text-zinc-700 dark:text-zinc-300">"{habit.name}"</span></p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Status Bar with Time */}
                    <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                        {whatsappStatus === 'connected' ? 'WhatsApp Connected' : whatsappStatus === 'connecting' ? 'Connecting...' : 'Not Connected'}
                                    </span>
                                </div>
                                {isVerified && (
                                    <div className="flex items-center gap-1 text-green-600">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-xs font-medium">Verified</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-zinc-500">IST</p>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono" style={{ minWidth: '70px', textAlign: 'right' }}>
                                    {timeString || currentTime.toLocaleTimeString('en-IN', { 
                                        timeZone: 'Asia/Kolkata',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-8" style={{ minHeight: '300px', maxHeight: 'calc(85vh - 200px)', overflowY: 'auto' }}>
                        {loadingProfile ? (
                            <div className="flex items-center justify-center p-8">
                                <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                            </div>
                        ) : !isVerified ? (
                            // Verification Flow: Show if number is not verified
                            <div className="space-y-6">
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 p-6 rounded-3xl text-center">
                                    <div className="w-16 h-16 bg-white dark:bg-zinc-900 shadow-md rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Smartphone className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Verify WhatsApp Number</h4>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                                        Enter your WhatsApp phone number and verify with a code to enable automation.
                                    </p>

                                    {verificationStep === 'input' ? (
                                        <>
                                            <div className="relative max-w-xs mx-auto mb-6">
                                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                                <input
                                                    type="tel"
                                                    placeholder="+1 234 567 8900"
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && phoneNumber.trim()) {
                                                            handleSendVerificationCode();
                                                        }
                                                    }}
                                                    className="w-full bg-white dark:bg-zinc-950 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-2xl py-3.5 pl-12 pr-4 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-center"
                                                    disabled={saving}
                                                />
                                            </div>

                                            <p className="text-xs text-indigo-500 dark:text-indigo-400 text-center mb-4">
                                                Press Enter to send verification code
                                            </p>

                                            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 mb-4">
                                                <Shield className="w-4 h-4 text-green-500" />
                                                Your number is stored securely and never shared.
                                            </div>

                                            <button
                                                onClick={handleSendVerificationCode}
                                                disabled={saving || !phoneNumber.trim()}
                                                className="w-full max-w-xs mx-auto py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                                            >
                                                {saving ? 'Sending...' : 'Send Verification Code'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                                Enter the 6-digit code we sent to your WhatsApp
                                            </p>
                                            <div className="relative max-w-xs mx-auto mb-6">
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-white dark:bg-zinc-950 border-2 border-green-100 dark:border-green-900/30 rounded-2xl py-3.5 px-4 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-center text-2xl tracking-widest"
                                                    disabled={verifyingCode}
                                                    autoFocus
                                                />
                                            </div>

                                            <button
                                                onClick={handleVerifyCode}
                                                disabled={verifyingCode || verificationCode.length !== 6}
                                                className="w-full max-w-xs mx-auto py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-green-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 mb-3"
                                            >
                                                {verifyingCode ? 'Verifying...' : 'Verify Code'}
                                            </button>

                                            {codeCountdown > 0 ? (
                                                <p className="text-xs text-zinc-500">Resend code in <span style={{ minWidth: '15px', display: 'inline-block' }}>{codeCountdownString}</span>s</p>
                                            ) : (
                                                <button
                                                    onClick={handleSendVerificationCode}
                                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                                    disabled={saving}
                                                >
                                                    Didn't receive the code? Resend
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Automation Settings: Visible only after verification
                            <>
                                {/* Verified Indicator */}
                                <div className="flex items-center justify-between border-2 border-green-500 bg-green-50 dark:bg-green-500/10 rounded-2xl p-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <p className="font-bold text-green-700 dark:text-green-300">Number Verified</p>
                                        </div>
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">{phoneNumber}</p>
                                    </div>
                                    <button
                                        onClick={handleRemoveNumber}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>

                                {/* Toggle Master Switch */}
                                <div className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-800/20">
                                    <div>
                                        <p className="font-bold text-zinc-900 dark:text-zinc-100">Enable Automation</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Allow interacting with this habit via WhatsApp.</p>
                                    </div>
                                    <button
                                        onClick={() => setEnabled(!enabled)}
                                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${enabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {enabled && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-8 overflow-hidden"
                                        >
                                            {/* Frequency Selection */}
                                            <div className="space-y-4">
                                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Delivery Frequency</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {frequencies.map((freq) => (
                                                        <button
                                                            key={freq.id}
                                                            onClick={() => setFrequency(freq.id as any)}
                                                            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${frequency === freq.id
                                                                ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                                                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                                }`}
                                                        >
                                                            <freq.icon className={`w-5 h-5 mt-0.5 ${frequency === freq.id ? 'text-green-500' : 'text-zinc-400'}`} />
                                                            <div>
                                                                <p className={`font-semibold text-sm ${frequency === freq.id ? 'text-green-700 dark:text-green-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                                    {freq.label}
                                                                </p>
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{freq.desc}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Time Selection */}
                                            {(frequency === 'daily' || frequency === 'weekly') && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Scheduled Time (IST)</label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                                        <input
                                                            type="time"
                                                            value={time}
                                                            onChange={(e) => setTime(e.target.value)}
                                                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Automation Info */}
                                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap className="w-4 h-4 text-blue-600" />
                                                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Automation Features</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-blue-600 dark:text-blue-400">
                                                    <div className="flex items-center gap-1">
                                                        <Send className="w-3 h-3" />
                                                        <span>Daily Reminders</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Activity className="w-3 h-3" />
                                                        <span>Poll Creation</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Bell className="w-3 h-3" />
                                                        <span>Habit Tracking</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <RefreshCw className="w-3 h-3" />
                                                        <span>Weekly Reports</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </div>

                    <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        {isVerified && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-zinc-900/20 dark:hover:shadow-zinc-100/20 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
