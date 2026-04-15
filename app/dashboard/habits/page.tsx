'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Habit } from '@/types';
import { Plus, Target, Zap, Clock, Calendar, Sparkles, Info, ChevronRight, MessageCircle, X, Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HabitCard from '@/components/HabitCard';
import { HabitSkeleton } from '@/components/Skeleton';
import { toast } from 'react-hot-toast';
import EditHabitModal from '@/components/EditHabitModal';

// Stable country codes array - moved outside component to prevent re-creation
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+61', country: 'Australia' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi' },
  { code: '+20', country: 'Egypt' },
  { code: '+92', country: 'Pakistan' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+62', country: 'Indonesia' },
  { code: '+60', country: 'Malaysia' },
  { code: '+63', country: 'Philippines' },
  { code: '+90', country: 'Turkey' },
  { code: '+55', country: 'Brazil' },
] as const;

function GlobalWhatsAppModal({
  isOpen,
  onClose,
  userWhatsAppNumber,
  userWhatsAppAutomation,
  userWhatsAppVerified,
  userUsername,
  habitsCount,
  reminderCount,
  onSave,
  onSaveReminders,
}: {
  isOpen: boolean;
  onClose: () => void;
  userWhatsAppNumber?: string;
  userWhatsAppAutomation?: boolean;
  userWhatsAppVerified?: boolean;
  userUsername?: string;
  habitsCount: number;
  reminderCount: number;
  onSave: (number: string, enabled: boolean) => Promise<void>;
  onSaveReminders: (enabled: boolean, time: string, interval: number, maxReminders: number) => Promise<void>;
}) {
  // Initialize state with stable defaults to prevent blinking
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify' | 'settings'>('phone');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderInterval, setReminderInterval] = useState(5);
  const [maxReminders, setMaxReminders] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse phone number safely
  const parsePhoneNumber = useCallback((inputNumber: string) => {
    if (!inputNumber) return { countryCode: '+91', phoneNumber: '' };
    
    const cleanNumber = inputNumber.replace(/\+/g, '').replace(/\D/g, '');
    
    // Try to match with country codes
    const matched = COUNTRY_CODES.find(c => {
      const codeWithoutPlus = c.code.slice(1);
      return cleanNumber.startsWith(codeWithoutPlus) && inputNumber.startsWith(c.code);
    });
    
    if (matched) {
      return {
        countryCode: matched.code,
        phoneNumber: cleanNumber.replace(matched.code.slice(1), '')
      };
    } else if (cleanNumber.length === 10) {
      // Assume US number if 10 digits
      return {
        countryCode: '+1',
        phoneNumber: cleanNumber
      };
    } else {
      // Use the number as-is
      return {
        countryCode: '+91',
        phoneNumber: cleanNumber
      };
    }
  }, []);

  // Initialize modal state only once when opening
  useEffect(() => {
    if (!isOpen || isInitialized) return;
    
    // Parse existing phone number
    if (userWhatsAppNumber) {
      const parsed = parsePhoneNumber(userWhatsAppNumber);
      setCountryCode(parsed.countryCode);
      setPhoneNumber(parsed.phoneNumber);
    } else {
      setPhoneNumber('');
    }
    
    // Set step based on verification status
    if (userWhatsAppVerified) {
      setStep('settings');
    } else if (userWhatsAppNumber) {
      setStep('verify');
    } else {
      setStep('phone');
    }
    
    // Set other states
    setEnabled(userWhatsAppAutomation || false);
    setReminderEnabled(reminderCount > 0);
    setIsInitialized(true);
  }, [isOpen, userWhatsAppNumber, userWhatsAppVerified, userWhatsAppAutomation, reminderCount, parsePhoneNumber, isInitialized]);

  // Reset initialization when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const fullPhoneNumber = phoneNumber && countryCode ? `${countryCode}${phoneNumber.replace(/\D/g, '')}` : '';

  // Memoize event handlers to prevent unnecessary re-renders
  const handleSendCode = useCallback(async () => {
    if (!fullPhoneNumber) { toast.error('Please enter a WhatsApp number'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/auth/me');
      const userData = await res.json();
      
      const verifyRes = await fetch('/api/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id, phoneNumber: fullPhoneNumber }),
      });
      
      const result = await verifyRes.json();
      if (verifyRes.ok) {
        toast.success(result.contactCreated ? `Contact created & code sent to ${userUsername}!` : `Verification code sent to ${userUsername}!`);
        setStep('verify');
        setCountdown(60);
      } else if (result.skipVerification) {
        // User is already verified, skip to settings
        toast.success('Already verified! Loading settings...');
        await onSave(fullPhoneNumber, true);
        setStep('settings');
      } else if (result.alreadyVerified) {
        toast.error(result.error);
      } else if (result.canResend === false) {
        toast.error(result.error);
        setCountdown(result.waitSeconds || 60);
      } else {
        toast.error(result.error || 'Failed to send code');
      }
    } catch { toast.error('Failed to send verification code'); }
    finally { setSending(false); }
  }, [fullPhoneNumber, userUsername, onSave]);

  const handleResendCode = useCallback(async () => {
    if (countdown > 0) return;
    await handleSendCode();
  }, [countdown, handleSendCode]);

  const handleVerify = useCallback(async () => {
    if (!verificationCode.trim()) { toast.error('Please enter verification code'); return; }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/me');
      const userData = await res.json();
      
      const verifyRes = await fetch('/api/whatsapp/verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id, verificationCode: verificationCode.trim() }),
      });
      
      const result = await verifyRes.json();
      if (verifyRes.ok) {
        toast.success('Phone number verified!');
        setStep('settings');
        await onSave(fullPhoneNumber, true);
      } else {
        toast.error(result.error || 'Invalid verification code');
      }
    } catch { toast.error('Verification failed'); }
    finally { setVerifying(false); }
  }, [verificationCode, fullPhoneNumber, onSave]);

  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      await onSave(fullPhoneNumber, enabled);
      if (reminderEnabled) await onSaveReminders(true, reminderTime, reminderInterval, maxReminders);
      else await onSaveReminders(false, reminderTime, reminderInterval, maxReminders);
      toast.success('Settings saved!');
      onClose();
    } catch { toast.error('Failed to save settings'); }
    finally { setSavingSettings(false); }
  }, [fullPhoneNumber, enabled, reminderEnabled, reminderTime, reminderInterval, maxReminders, onSave, onSaveReminders, onClose]);

  const handleChangeNumber = useCallback(() => {
    setStep('phone');
    setVerificationCode('');
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="whatsapp-automation-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden max-h-[85vh] overflow-y-auto"
          >
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <MessageCircle className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {step === 'phone' ? 'Setup WhatsApp' : step === 'verify' ? 'Verify Number' : 'WhatsApp Settings'}
              </h3>
              <p className="text-xs font-medium text-zinc-500">
                {step === 'phone' ? 'Enter your WhatsApp number' : step === 'verify' ? `Code sent to ${userUsername}` : `${habitsCount} habits`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6">
          {step === 'phone' && (
            <>
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-200 dark:border-blue-500/30">
                <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-400">We'll create a contact named <strong>{userUsername}</strong> in WhatsApp and send a verification code.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">WhatsApp Number</label>
                <div className="flex gap-2">
                  <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-3 px-3 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                    {COUNTRY_CODES.map((c: { code: string; country: string }) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.country})</option>
                    ))}
                  </select>
                  <input type="tel" placeholder="1234567890" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-3 px-4 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                </div>
                {fullPhoneNumber && <p className="text-xs text-green-600 font-medium">Preview: {fullPhoneNumber}</p>}
              </div>
              <button onClick={handleSendCode} disabled={sending || !phoneNumber.trim()} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : 'Send Verification Code'}
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-200 dark:border-green-500/30">
                <MessageCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-400">We sent a 6-digit code to <strong>{userUsername}</strong>. Check your WhatsApp and enter the code below.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Verification Code</label>
                <input type="text" placeholder="000000" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 px-4 text-zinc-900 dark:text-zinc-100 font-bold text-center text-2xl tracking-widest focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" maxLength={6} />
              </div>
              <div className="flex gap-3">
                <button onClick={handleChangeNumber} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold">Change Number</button>
                <button onClick={handleVerify} disabled={verifying || verificationCode.length !== 6} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {verifying ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : 'Verify Code'}
                </button>
              </div>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-zinc-500">Resend code in <span className="font-bold text-green-600">{countdown}</span>s</p>
                ) : (
                  <button onClick={handleResendCode} className="text-sm text-green-600 font-bold hover:underline">Resend Verification Code</button>
                )}
              </div>
            </>
          )}

          {step === 'settings' && (
            <>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-200 dark:border-green-500/30">
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400 font-semibold">WhatsApp Verified!</p>
                  <p className="text-xs text-green-600/70">Contact: {userUsername} • {fullPhoneNumber || userWhatsAppNumber}</p>
                </div>
              </div>

              <button onClick={handleChangeNumber} className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline">
                Change phone number
              </button>

              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <div><p className="font-bold text-zinc-900 dark:text-zinc-100">WhatsApp Automation</p><p className="text-xs text-zinc-500 mt-0.5">Enable daily summaries</p></div>
                <button onClick={() => setEnabled(!enabled)} className={`relative w-14 h-7 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                  <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-200 dark:border-blue-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div><p className="font-bold text-zinc-900 dark:text-zinc-100">Daily Reminders</p><p className="text-xs text-zinc-500 mt-0.5">Send reminders to all habits</p></div>
                  <button onClick={() => setReminderEnabled(!reminderEnabled)} className={`relative w-14 h-7 rounded-full transition-colors ${reminderEnabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>
                {reminderEnabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    <div><label className="text-xs font-bold text-zinc-500 uppercase">Reminder Time</label>
                      <div className="flex items-center gap-2 mt-1"><Clock size={16} className="text-blue-600" /><input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm" /></div>
                    </div>
                    <div><label className="text-xs font-bold text-zinc-500 uppercase">Retry Interval</label>
                      <div className="flex gap-2 mt-1">{[1, 3, 5, 10].map(mins => (<button key={mins} onClick={() => setReminderInterval(mins)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reminderInterval === mins ? 'bg-blue-500 text-white' : 'bg-white dark:bg-zinc-800'}`}>{mins}m</button>))}</div>
                    </div>
                    <div><label className="text-xs font-bold text-zinc-500 uppercase">Max Reminders</label>
                      <div className="flex gap-2 mt-1">{[1, 2, 3, 5, 10].map(num => (<button key={num} onClick={() => setMaxReminders(num)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${maxReminders === num ? 'bg-blue-500 text-white' : 'bg-white dark:bg-zinc-800'}`}>{num}x</button>))}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200"><p className="text-2xl font-bold text-green-600">{enabled ? habitsCount : 0}</p><p className="text-[10px] font-bold text-green-600/70 uppercase">Automated</p></div>
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200"><p className="text-2xl font-bold text-blue-600">{reminderEnabled ? habitsCount : reminderCount}</p><p className="text-[10px] font-bold text-blue-600/70 uppercase">Reminders</p></div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200"><p className="text-2xl font-bold text-zinc-900">{habitsCount}</p><p className="text-[10px] font-bold text-zinc-500 uppercase">Total</p></div>
              </div>

              <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {savingSettings ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Settings'}
              </button>
            </>
          )}
        </div>
      </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [userWhatsAppNumber, setUserWhatsAppNumber] = useState<string>('');
  const [userWhatsAppAutomation, setUserWhatsAppAutomation] = useState<boolean>(false);
  const [userWhatsAppVerified, setUserWhatsAppVerified] = useState<boolean>(false);
  const [userUsername, setUserUsername] = useState<string>('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedHabitForEdit, setSelectedHabitForEdit] = useState<Habit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => { setHasMounted(true); fetchHabits(); fetchUserWhatsApp(); }, []);

  const fetchUserWhatsApp = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) { 
        const data = await res.json(); 
        setUserWhatsAppNumber(data.whatsappNumber || ''); 
        setUserWhatsAppAutomation(data.whatsappAutomation || false);
        setUserWhatsAppVerified(data.whatsappVerified || false);
        setUserUsername(data.username || '');
      }
    } catch (error) { console.error('Failed to fetch user WhatsApp status:', error); }
  };

  const fetchHabits = async () => {
    try {
      const res = await fetch('/api/habits');
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (error) { console.error('Failed to fetch habits:', error); }
    finally { setLoading(false); }
  };

  const handleGlobalWhatsAppSave = async (number: string, enabled: boolean) => {
    const res = await fetch('/api/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ whatsappNumber: number, whatsappAutomation: enabled }) });
    if (!res.ok) throw new Error('Failed to save');
    if (enabled) { for (const habit of habits) { if (!habit.whatsappEnabled) { await fetch(`/api/habits/${habit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ whatsappEnabled: true }) }); } } }
    await Promise.all([fetchHabits(), fetchUserWhatsApp()]);
  };

  const handleGlobalReminderSave = async (enabled: boolean, time: string, interval: number, maxReminders: number) => {
    for (const habit of habits) { await fetch(`/api/habits/${habit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reminderEnabled: enabled, reminderTime: time, reminderInterval: interval, maxReminders: maxReminders }) }); }
    await fetchHabits();
  };

  const handleEditHabit = (habit: Habit) => {
    setSelectedHabitForEdit(habit);
    setIsEditModalOpen(true);
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (window.confirm('Are you sure you want to delete this habit? This cannot be undone.')) {
      try {
        const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Habit deleted');
          fetchHabits();
        } else {
          toast.error('Failed to delete habit');
        }
      } catch (error) {
        toast.error('An error occurred');
      }
    }
  };

  const handleToggleVisibility = async (habitId: string, hidden: boolean) => {
    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
      if (res.ok) {
        toast.success(hidden ? 'Ritual concealed' : 'Ritual revealed', {
          icon: hidden ? '👻' : '👁️',
        });
        fetchHabits();
      } else {
        toast.error('Failed to update visibility');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const reminderCount = habits.filter(h => h.reminderEnabled).length;
  const isWhatsAppReady = !!userWhatsAppNumber && !!userWhatsAppAutomation;

  const categories = ['All', 'Health', 'Mindset', 'Growth', 'Other'];
  const filteredHabits = activeCategory === 'All' ? habits : habits.filter(h => h.category === activeCategory);

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 pb-20 pt-24">
      <AnimatePresence mode="wait">
        {showWhatsAppModal && (
          <GlobalWhatsAppModal 
            isOpen={showWhatsAppModal} 
            onClose={() => setShowWhatsAppModal(false)} 
            userWhatsAppNumber={userWhatsAppNumber} 
            userWhatsAppAutomation={userWhatsAppAutomation} 
            userWhatsAppVerified={userWhatsAppVerified} 
            userUsername={userUsername} 
            habitsCount={habits.length} 
            reminderCount={reminderCount} 
            onSave={handleGlobalWhatsAppSave} 
            onSaveReminders={handleGlobalReminderSave} 
          />
        )}
      </AnimatePresence>
      <div className="responsive-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-8 mb-6 sm:mb-12">
          <div className="flex flex-col gap-1 sm:gap-2">
            <span className="responsive-text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-1">Management</span>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative w-10 h-10 sm:w-16 sm:h-16 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="DailyHabit Flow"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="responsive-text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tightest leading-none">
                Daily Habit <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Flow</span>
              </h1>
            </div>
            <p className="responsive-text-xs sm:responsive-text-base text-zinc-500 dark:text-zinc-400 font-medium tracking-tight px-1">Curate the habits that define who you are.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mt-1 sm:mt-0">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-1 rounded-lg sm:rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-x-auto no-scrollbar max-w-full">
              {categories.map((cat) => (<motion.button key={cat} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveCategory(cat)} className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-md sm:rounded-xl responsive-text-xs font-bold capitalize transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>{cat}</motion.button>))}
            </motion.div>
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowWhatsAppModal(true)} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all touch-button shadow-md ${isWhatsAppReady ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'}`}>
                <MessageCircle size={16} /><span className="">{isWhatsAppReady ? 'Automation' : 'WhatsApp'}</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/dashboard/habits/new')} className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 touch-button"><Plus size={16} />New Habit</motion.button>
            </div>
          </div>
        </motion.div>
        {loading ? (<div className="responsive-grid-mobile md:responsive-grid">{[...Array(6)].map((_, i) => <HabitSkeleton key={i} />)}</div>) : (<div className="responsive-grid-mobile md:responsive-grid"><AnimatePresence mode="popLayout">{filteredHabits.map((habit, index) => (<motion.div key={habit.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: index * 0.03 }}><HabitCard habit={habit} completed={false} onToggle={() => fetchHabits()} userWhatsAppNumber={userWhatsAppNumber} userWhatsAppAutomation={userWhatsAppAutomation} onEdit={handleEditHabit} onDelete={handleDeleteHabit} onToggleVisibility={handleToggleVisibility} /></motion.div>))}{filteredHabits.length === 0 && (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="col-span-full py-16 text-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800"><div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4"><Info size={24} className="text-indigo-500 dark:text-indigo-400 sm:w-8 sm:h-8" /></div><h3 className="responsive-text-sm sm:responsive-text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">No habits found</h3><p className="responsive-text-xs text-zinc-500 dark:text-zinc-400 mb-4">Start by creating your first habit.</p><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/dashboard/habits/new')} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20">Create Your First Habit</motion.button></motion.div>)}</AnimatePresence></div>)}
        <EditHabitModal isOpen={isEditModalOpen} habit={selectedHabitForEdit} onClose={() => setIsEditModalOpen(false)} onSuccess={fetchHabits} />
      </div>


    </div>
  );
}
