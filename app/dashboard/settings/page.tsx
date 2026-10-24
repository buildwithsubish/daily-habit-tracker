'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  BellOff, 
  Check, 
  Clock3, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  AlertCircle, 
  X,
  User as UserIcon,
  Mail,
  Calendar,
  Globe,
  Scale,
  Activity,
  Heart,
  Save,
  ShieldCheck,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  requestNotificationPermission, 
  triggerNotification, 
  isIOS, 
  isStandalonePWA 
} from '@/lib/notifications';

const STORAGE_KEY = 'habit-reminder';
const SOUND_STORAGE_KEY = 'habit-reminder-sound';

export default function SettingsPage() {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // User Profile State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState('UTC');
  const [savingProfile, setSavingProfile] = useState(false);

  // Wellness / Health Profile State
  const [age, setAge] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [lastWeightUpdate, setLastWeightUpdate] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'very' | 'extra' | ''>('');
  const [healthGoal, setHealthGoal] = useState<'loss' | 'maintain' | 'gain' | ''>('');
  const [savingHealth, setSavingHealth] = useState(false);

  // Reminder State
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('09:00');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);

  // iOS Specific Guidance
  const [isApple, setIsApple] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [iosDismissed, setIosDismissed] = useState(false);

  useEffect(() => {
    try {
      setIsApple(isIOS());
      setIsPwa(isStandalonePWA());
      if (localStorage.getItem('ios-guide-dismissed') === 'true') {
        setIosDismissed(true);
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const value = JSON.parse(stored);
        setEnabled(Boolean(value.enabled));
        if (typeof value.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) setTime(value.time);
      }

      const storedSound = localStorage.getItem(SOUND_STORAGE_KEY);
      if (storedSound !== null) {
        setSoundEnabled(storedSound === 'true');
      }

      setPermission('Notification' in window ? Notification.permission : 'unsupported');
    } catch { /* retain defaults */ }

    // Fetch user profile from API
    fetch('/api/user/profile', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load profile');
        return response.json();
      })
      .then(data => {
        if (data) {
          if (data.username) setUsername(data.username);
          if (data.email) setEmail(data.email);
          const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
          if (data.timeZone && data.timeZone !== 'UTC') {
            setTimeZone(data.timeZone);
          } else {
            setTimeZone(detectedZone);
          }
          if (data.createdAt) setCreatedAt(data.createdAt);

          if (data.age !== undefined && data.age !== null) setAge(data.age);
          if (data.height !== undefined && data.height !== null) setHeight(data.height);
          if (data.weight !== undefined && data.weight !== null) setWeight(data.weight);
          if (data.lastWeightUpdate) setLastWeightUpdate(data.lastWeightUpdate);
          if (data.gender) setGender(data.gender);
          if (data.activityLevel) setActivityLevel(data.activityLevel);
          if (data.healthGoal) setHealthGoal(data.healthGoal);

          if (typeof data.reminderEnabled === 'boolean') setEnabled(data.reminderEnabled);
          if (typeof data.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime)) setTime(data.reminderTime);
          if (typeof data.soundEnabled === 'boolean') setSoundEnabled(data.soundEnabled);
          setReminderSaved(true);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setReady(true));
  }, []);

  // Save Identity Profile (Username, Timezone)
  const saveProfile = async () => {
    if (savingProfile) return;
    if (!username.trim()) {
      toast.error('Username cannot be blank');
      return;
    }
    setSavingProfile(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          timeZone: timeZone.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      toast.success('Account profile updated successfully! 🎉');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Health & Wellness Profile
  const saveHealthProfile = async () => {
    if (savingHealth) return;
    setSavingHealth(true);

    try {
      const payload: Record<string, any> = {};
      if (age !== '') payload.age = Number(age);
      if (height !== '') payload.height = Number(height);
      if (weight !== '') payload.weight = Number(weight);
      if (gender !== '') payload.gender = gender;
      if (activityLevel !== '') payload.activityLevel = activityLevel;
      if (healthGoal !== '') payload.healthGoal = healthGoal;

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update health metrics');
      }

      const resData = await response.json();
      if (resData.profile?.lastWeightUpdate) {
        setLastWeightUpdate(resData.profile.lastWeightUpdate);
      }

      toast.success('Wellness metrics saved successfully! ✨');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save health metrics');
    } finally {
      setSavingHealth(false);
    }
  };

  // Save Reminders & Notifications
  const saveReminders = async () => {
    if (savingReminder) return;
    setSavingReminder(true);
    setReminderSaved(false);

    try {
      if (enabled && 'Notification' in window && permission === 'default') {
        const nextPermission = await requestNotificationPermission();
        setPermission(nextPermission);
      }

      // Normalize time to HH:MM format
      let normalizedTime = time.trim();
      const timeMatch = normalizedTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
      if (timeMatch) {
        normalizedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      } else {
        normalizedTime = '09:00';
      }

      const activeZone = timeZone.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderEnabled: enabled,
          reminderTime: normalizedTime,
          soundEnabled,
          timeZone: activeZone,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not save reminder preferences');
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, time: normalizedTime }));
        localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
        localStorage.setItem('user-timezone', activeZone);
        localStorage.setItem('preferences-configured', 'true');
        window.dispatchEvent(new CustomEvent('preferences-updated'));
      } catch { /* account preferences are already saved */ }

      setReminderSaved(true);
      toast.success('Reminder preferences and timezone updated! 🔔');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save reminder preferences');
    } finally {
      setSavingReminder(false);
    }
  };

  if (!ready) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto mb-3" />
        Loading your account profile and preferences…
      </div>
    );
  }

  const memberSinceFormatted = createdAt 
    ? format(new Date(createdAt), 'MMMM yyyy') 
    : 'Recent Member';

  const userInitial = (username || email || 'U')[0].toUpperCase();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-16">
      {/* Executive Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Account & System
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            <ShieldCheck size={11} />
            Verified Account
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Settings & Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          Manage your account identity, wellness calibration, and daily routine notifications.
        </p>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100 flex items-center gap-3 shadow-sm" role="alert">
          <AlertCircle size={20} className="shrink-0 text-rose-500" />
          <span>Could not sync profile settings with the server. Local changes can still be updated below.</span>
        </div>
      )}

      {/* 1. Account & Identity Profile Card */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#12141D] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                {userInitial}
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {username || 'Habit Practitioner'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Mail size={13} />
                  <span>{email || 'No email associated'}</span>
                  <span>•</span>
                  <Calendar size={13} />
                  <span>Member since {memberSinceFormatted}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto disabled:opacity-60"
            >
              <Save size={15} />
              <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Display Name / Username
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">Your personalized greeting on the dashboard.</p>
            </div>

            {/* Timezone Selector / Display */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Account Timezone
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    if (localZone) {
                      setTimeZone(localZone);
                      toast.success(`Detected local timezone: ${localZone}`);
                    }
                  }}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Auto-detect
                </button>
              </div>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  placeholder="e.g., UTC, America/New_York, Asia/Kolkata"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">Used for calculating daily calendar reset and scheduled notifications.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Wellness & Physical Health Profile */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#12141D] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-900/40">
                <Heart size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Wellness Profile & Body Calibration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Used exclusively to tailor hydration targets, monthly health check-ins, and activity pacing.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={saveHealthProfile}
              disabled={savingHealth}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-zinc-700 active:scale-95 transition-all self-start sm:self-auto disabled:opacity-60"
            >
              <Scale size={14} />
              <span>{savingHealth ? 'Updating...' : 'Update Metrics'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Age */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Age</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="13"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="25"
                  className="w-full bg-transparent font-bold text-base text-slate-900 dark:text-white outline-none"
                />
                <span className="text-xs font-semibold text-slate-400">yrs</span>
              </div>
            </div>

            {/* Height */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Height</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="80"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="175"
                  className="w-full bg-transparent font-bold text-base text-slate-900 dark:text-white outline-none"
                />
                <span className="text-xs font-semibold text-slate-400">cm</span>
              </div>
            </div>

            {/* Weight */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Weight</span>
                {lastWeightUpdate && (
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Logged</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="25"
                  max="400"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="70"
                  className="w-full bg-transparent font-bold text-base text-slate-900 dark:text-white outline-none"
                />
                <span className="text-xs font-semibold text-slate-400">kg</span>
              </div>
            </div>

            {/* Gender */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-transparent font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-zinc-900">Select</option>
                <option value="male" className="dark:bg-zinc-900">Male</option>
                <option value="female" className="dark:bg-zinc-900">Female</option>
                <option value="other" className="dark:bg-zinc-900">Other</option>
              </select>
            </div>

            {/* Activity Level */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Activity</span>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
                className="w-full bg-transparent font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-zinc-900">Select</option>
                <option value="sedentary" className="dark:bg-zinc-900">Sedentary</option>
                <option value="light" className="dark:bg-zinc-900">Light</option>
                <option value="moderate" className="dark:bg-zinc-900">Moderate</option>
                <option value="very" className="dark:bg-zinc-900">Very Active</option>
              </select>
            </div>

            {/* Health Goal */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Goal</span>
              <select
                value={healthGoal}
                onChange={(e) => setHealthGoal(e.target.value as any)}
                className="w-full bg-transparent font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-zinc-900">Select</option>
                <option value="maintain" className="dark:bg-zinc-900">Maintain</option>
                <option value="loss" className="dark:bg-zinc-900">Fat Loss</option>
                <option value="gain" className="dark:bg-zinc-900">Muscle Gain</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Daily Reminders & Alerts */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#12141D] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40">
              <Bell size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-950 dark:text-slate-100">Daily Habit Check-in & Reminders</h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                A calm, predictable daily reminder to log rituals and maintain unbroken streaks.
              </p>
            </div>
          </div>

          {/* Time & Enable Switch */}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end bg-slate-50/80 dark:bg-zinc-800/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Check-in Time <span className="font-normal text-xs text-slate-500">({timeZone})</span>
              <input
                aria-label="Reminder time"
                type="time"
                value={time}
                onChange={event => { setTime(event.target.value); setReminderSaved(false); }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-900"
              />
            </label>
            <button
              type="button"
              onClick={() => { setEnabled(!enabled); setReminderSaved(false); }}
              aria-pressed={enabled}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:w-auto ${
                enabled
                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20'
              }`}
            >
              {enabled ? <><BellOff size={16} /> Disable Reminder</> : <><Bell size={16} /> Enable Reminder</>}
            </button>
          </div>

          {/* Notification Sound Setting (Device Default) */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Notification Sound</p>
                <p className="text-xs text-slate-500">Play standard device default alert tone when check-in arrives</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                setReminderSaved(false);
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                soundEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                soundEnabled ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* iOS Specific Guidance */}
          {isApple && !iosDismissed && (
            <div className="relative rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-start gap-2.5">
                <Smartphone size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 flex-1">
                  <p className="font-bold mb-1">Apple iOS (iPhone / iPad) Compatibility</p>
                  <p className="mb-2">
                    {isPwa 
                      ? '✓ Installed in Standalone Mode. System Web Push notifications are supported on iOS 16.4+.'
                      : 'To receive system notifications on iOS, tap the Safari Share button (square with arrow) and choose "Add to Home Screen".'}
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    In-app reminders and device default alerts work reliably whenever this app is open or active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIosDismissed(true);
                    try {
                      localStorage.setItem('ios-guide-dismissed', 'true');
                    } catch {}
                  }}
                  className="p-1 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-900/50 text-amber-800/60 hover:text-amber-950 dark:text-amber-300/60 dark:hover:text-amber-100 transition-colors"
                  aria-label="Dismiss iOS guide"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Browser Permission Status */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-3 bg-slate-50/50 dark:bg-zinc-800/20">
            <Smartphone size={17} className="mt-0.5 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Browser Notification Permission</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {permission === 'unsupported' 
                  ? 'System push alerts are not supported by this browser mode; smooth in-app visual and sound reminders will be used.' 
                  : permission === 'granted' 
                  ? 'Allowed by your browser. System push alerts are fully active.' 
                  : permission === 'denied' 
                  ? 'Blocked by your browser. You will still receive gentle in-app sound and banner notifications while the app is open.' 
                  : 'Not requested yet. Permission will be prompted when saving an enabled reminder.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {reminderSaved ? '✓ Your reminder preferences are saved.' : 'Unsaved changes in reminder settings.'}
          </p>
          <button
            type="button"
            onClick={saveReminders}
            disabled={savingReminder}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-xs sm:text-sm font-bold text-white transition-all hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-wait disabled:opacity-60 sm:w-auto shadow-md shadow-indigo-500/20"
          >
            {savingReminder ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Saving…
              </>
            ) : (
              <>
                <Check size={16} />
                {reminderSaved ? 'Saved' : 'Save Reminders'}
              </>
            )}
          </button>
        </footer>
      </section>

      {/* 4. Habit Protocols & Curated Presets */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#12141D] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/40">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Curated Habit Protocols & Presets
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ready-to-use routine templates designed for health, strength, focus, and recovery.
                </p>
              </div>
            </div>

            <Link
              href="/presets"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <span>Explore All Protocols</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <Link
              href="/presets"
              className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-zinc-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    Fitness
                  </span>
                  <Zap size={14} className="text-orange-500" />
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  1-Year Hypertrophy PPL Protocol
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  7-day split covering Push, Pull, Legs, Active Recovery, and periodized training weights.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                View & Apply <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link
              href="/presets"
              className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-zinc-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Health
                  </span>
                  <Activity size={14} className="text-emerald-500" />
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Morning Intention Routine
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  Hydration, morning sunlight, light movement, and prioritized daily focus planning.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                View & Apply <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link
              href="/presets"
              className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-zinc-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Diet
                  </span>
                  <Scale size={14} className="text-amber-500" />
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Lean Bulk Diet (2,220 kcal)
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  133g protein target, 6 structured meals, water calibration, and restorative sleep.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                View & Apply <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
