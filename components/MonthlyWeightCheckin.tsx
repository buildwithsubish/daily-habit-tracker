'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Check, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { differenceInCalendarDays, parseISO } from 'date-fns';

interface MonthlyWeightCheckinProps {
  currentWeight?: number;
  lastWeightUpdate?: string | null;
  onWeightSaved: (newWeight: number) => void;
}

export default function MonthlyWeightCheckin({
  currentWeight,
  lastWeightUpdate,
  onWeightSaved,
}: MonthlyWeightCheckinProps) {
  const [weightInput, setWeightInput] = useState<string>(currentWeight ? String(currentWeight) : '68');
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [daysSince, setDaysSince] = useState<number | null>(null);

  useEffect(() => {
    // Check if snooze is active
    const snoozedUntil = localStorage.getItem('daily_habit_weight_snooze');
    if (snoozedUntil && new Date(snoozedUntil).getTime() > Date.now()) {
      setIsVisible(false);
      return;
    }

    const storedLastUpdate = lastWeightUpdate || localStorage.getItem('daily_habit_last_weight_update');

    // If weight is already saved and no update timestamp exists, mark it as updated today so it doesn't nag the user
    if (currentWeight && !storedLastUpdate) {
      localStorage.setItem('daily_habit_last_weight_update', new Date().toISOString());
      setIsVisible(false);
      return;
    }

    if (!currentWeight) {
      setIsVisible(true);
      return;
    }

    try {
      const effectiveDate = storedLastUpdate ? parseISO(storedLastUpdate) : new Date();
      const days = differenceInCalendarDays(new Date(), effectiveDate);
      setDaysSince(days);
      // Show strictly once every 30 days
      if (days >= 30) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } catch {
      setIsVisible(false);
    }
    const handleOpenManual = () => setIsVisible(true);
    window.addEventListener('open-weight-checkin', handleOpenManual);
    return () => window.removeEventListener('open-weight-checkin', handleOpenManual);
  }, [currentWeight, lastWeightUpdate]);

  const handleSnooze = () => {
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('daily_habit_weight_snooze', threeDaysLater);
    setIsVisible(false);
    toast('Reminder snoozed for 3 days', { icon: '⏰' });
  };

  const handleSave = async () => {
    const num = parseFloat(weightInput);
    if (!Number.isFinite(num) || num < 30 || num > 300) {
      toast.error('Please enter a valid weight (30–300 kg)');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: num }),
      });

      if (!res.ok) throw new Error('Failed to update weight');

      toast.success(`Weight updated to ${num} kg! Targets calibrated for the next 30 days.`, {
        icon: '⚖️',
        duration: 5000,
      });

      localStorage.setItem('daily_habit_last_weight_update', new Date().toISOString());
      localStorage.removeItem('daily_habit_weight_snooze');
      setIsVisible(false);
      onWeightSaved(num);
    } catch (err) {
      console.error(err);
      toast.error('Could not save weight. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weightInput) || 68;
    const next = Math.max(30, Math.min(300, Math.round((current + delta) * 10) / 10));
    setWeightInput(String(next));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        className="mb-6 overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-white p-4 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Label & Description */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Monthly Check-in
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {daysSince !== null ? `${daysSince} days since last check` : 'Every 30 days'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                What is your current body weight?
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Asked only once a month to calibrate TDEE & progressive targets without daily scale stress.
              </p>
            </div>
          </div>

          {/* Controls & Quick Action */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-inner dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => adjustWeight(-0.5)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-700 font-bold text-base"
                aria-label="Decrease weight"
              >
                –
              </button>
              <div className="flex items-center px-2">
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-16 bg-transparent text-center text-base font-black text-slate-900 focus:outline-none dark:text-white"
                  aria-label="Current weight in kilograms"
                />
                <span className="text-xs font-bold text-slate-400">kg</span>
              </div>
              <button
                type="button"
                onClick={() => adjustWeight(0.5)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-700 font-bold text-base"
                aria-label="Increase weight"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{isSaving ? 'Saving...' : 'Update & Calibrate'}</span>
            </button>

            <button
              type="button"
              onClick={handleSnooze}
              className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              title="Snooze for 3 days"
            >
              <Clock size={14} />
              <span>Later</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
