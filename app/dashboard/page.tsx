'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Habit, DailyLog } from '@/types';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import AchievementBadges from '@/components/AchievementBadges';
import HabitStats from '@/components/HabitStats';
import StreakCelebration from '@/components/StreakCelebration';
import UnifiedHabitList from '@/components/UnifiedHabitList';
import { getToday, isHabitScheduled } from '@/lib/utils';
import { ChevronRight, Target, Clock, CheckCircle2, X, Send, RefreshCw, MessageCircle, Calendar } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { HabitSkeleton, StatsSkeleton } from '@/components/Skeleton';
import { toast } from 'react-hot-toast';
 
export default function DashboardPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [hasMounted, setHasMounted] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [userWhatsAppNumber, setUserWhatsAppNumber] = useState<string>('');
  const [userWhatsAppAutomation, setUserWhatsAppAutomation] = useState<boolean>(false);
  const [whatsappVerified, setWhatsappVerified] = useState<boolean>(false);
  const [sendingPoll, setSendingPoll] = useState(false);
  const [celebration, setCelebration] = useState<{ isOpen: boolean; type: '7-day' | '30-day' | 'daily' }>({
    isOpen: false,
    type: '7-day',
  });
  const [appreciation, setAppreciation] = useState<{ emoji: string; message: string } | null>(null);
  const [showAppreciation, setShowAppreciation] = useState(true);

  useEffect(() => {
    setHasMounted(true);
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHabits(), fetchLogs(), fetchUser(), fetchAppreciation()]);
      setLoading(false);
    };
    loadData();
  }, [selectedDate]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username || '');
        setUserWhatsAppNumber(data.whatsappNumber || '');
        setUserWhatsAppAutomation(data.whatsappAutomation || false);
        setWhatsappVerified(data.whatsappVerified || false);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const sendDailyPoll = async () => {
    if (!whatsappVerified || !userWhatsAppAutomation) {
      toast.error('Please verify WhatsApp and enable automation first');
      return;
    }

    setSendingPoll(true);
    try {
      const res = await fetch('/api/whatsapp/poll', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Daily poll sent to your WhatsApp! ✅');
      } else {
        toast.error(data.error || 'Failed to send poll');
      }
    } catch (error) {
      console.error('Failed to send poll:', error);
      toast.error('Failed to send poll');
    } finally {
      setSendingPoll(false);
    }
  };

  const fetchAppreciation = async () => {
    try {
      const res = await fetch('/api/appreciation');
      if (res.ok) {
        const data = await res.json();
        setAppreciation(data);
      }
    } catch (error) {
      console.error('Failed to fetch appreciation:', error);
    }
  };

  const fetchHabits = async () => {
    try {
      const res = await fetch('/api/habits');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const weekStart = format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd');
      const res = await fetch(`/api/logs?startDate=${weekStart}&endDate=${weekEnd}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const handleToggle = async (habitId: string, stepIndex?: number, activityNote?: string, subActivities?: any[]) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const existingLog = logs.find(
      log => log.habitId === habitId &&
        log.date === selectedDate &&
        (habit.type === 'single-step' ? (log.stepIndex === null || log.stepIndex === undefined) : log.stepIndex === stepIndex)
    );

    const completed = !existingLog?.completed;
    const previousLogs = [...logs];

    // Optimistic Update
    if (completed) {
      const newLog: DailyLog = {
        id: `temp-${Date.now()}`,
        userId: 'temp',
        habitId,
        date: selectedDate,
        stepIndex,
        completed: true,

        activityNote,
        subActivities: subActivities || [],
      };
      setLogs(prev => [...prev, newLog]);
    } else {
      setLogs(prev => prev.filter(l => l !== existingLog));
    }

    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          date: selectedDate,
          stepIndex: stepIndex ?? null,
          completed,
          activityNote: activityNote || undefined,
          subActivities: subActivities || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to update log');

      const result = await res.json();

      // Handle celebrations using API-calculated status
      if (completed && selectedDate === getToday()) {
        const newStreak = result.streak;
        if (newStreak === 7) setCelebration({ isOpen: true, type: '7-day' });
        else if (newStreak === 30) setCelebration({ isOpen: true, type: '30-day' });
        else if (result.dailyAllDone) {
          setCelebration({ isOpen: true, type: 'daily' });
        }
      }

      // Sync state for accuracy without full reload if possible
      // but habits need streak updates, so fetchHabits still needed
      fetchLogs();
      fetchHabits();
      window.dispatchEvent(new CustomEvent('habit-refetch'));
    } catch (error) {
      console.error('Failed to update log:', error);
      setLogs(previousLogs); // Rollback
      toast.error('Failed to sync progress. Please try again.');
    }
  };


  const handleSettingsSave = async (habitId: string, settings: Partial<Habit>) => {
    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        fetchHabits();
        window.dispatchEvent(new CustomEvent('habit-refetch'));
      } else {
        throw new Error('Failed to update habit');
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleGlobalWhatsAppToggle = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappAutomation: enabled }),
      });
      if (res.ok) {
        setUserWhatsAppAutomation(enabled);
        fetchUser();
      }
    } catch (error) {
      console.error('Failed to toggle WhatsApp automation:', error);
    }
  };

  const getHabitCompletion = (habitId: string, date: string = selectedDate) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return false;

    if (habit.type === 'single-step') {
      const log = logs.find(l => l.habitId === habitId && l.date === date && (l.stepIndex === null || l.stepIndex === undefined));
      return log?.completed || false;
    } else {
      const completedSteps = logs
        .filter(l => l.habitId === habitId && l.date === date && l.completed && l.stepIndex !== null && l.stepIndex !== undefined)
        .map(l => l.stepIndex as number);
      return completedSteps.length === habit.steps.length;
    }
  };

  const getStepCompletions = (habitId: string, date: string = selectedDate) => {
    return logs
      .filter(l => l.habitId === habitId && l.date === date && l.completed && l.stepIndex !== null && l.stepIndex !== undefined)
      .map(l => l.stepIndex as number)
      .sort((a, b) => a - b);
  };

  const scheduledHabits = habits.filter(h => (h.active !== false) && isHabitScheduled(h, selectedDate));
  const completedHabitsCount = scheduledHabits.filter(h => getHabitCompletion(h.id)).length;

  const completionRate = scheduledHabits.length > 0
    ? (completedHabitsCount / scheduledHabits.length) * 100
    : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = username ? `, ${username}` : '';
    if (hour < 12) return `Good morning${name}`;
    if (hour < 18) return `Good afternoon${name}`;
    return `Good evening${name}`;
  };

  const getWeeklyCompletionData = () => {
    const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    const completionData: Record<string, { completed: number; total: number }> = {};

    for (let i = 0; i < 7; i++) {
      const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const scheduledForDay = habits.filter(h => isHabitScheduled(h, dateStr));
      const completedForDay = scheduledForDay.filter(h => getHabitCompletion(h.id, dateStr)).length;
      completionData[dateStr] = {
        completed: completedForDay,
        total: scheduledForDay.length
      };
    }
    return completionData;
  };

  if (!hasMounted) return null;

  return (
    <div className="pb-20 sm:pb-8">
      <StreakCelebration
        isOpen={celebration.isOpen}
        onClose={() => setCelebration({ ...celebration, isOpen: false })}
        type={celebration.type}
      />

      {/* Appreciation Banner */}
      <AnimatePresence>
        {appreciation && showAppreciation && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6"
          >
            <div className="relative overflow-hidden bg-indigo-600 rounded-2xl px-5 py-4 text-white shadow-lg shadow-indigo-600/20">
              {/* Decorative background circle */}
              <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shadow-inner">
                  {appreciation.emoji}
                </div>
                <p className="flex-1 text-sm font-semibold leading-tight text-white/95">{appreciation.message}</p>
                <button
                  onClick={() => setShowAppreciation(false)}
                  className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tightest">
            {getGreeting()}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Calendar size={14} className="opacity-60" />
            <p className="text-xs font-bold uppercase tracking-widest">
              {format(new Date(selectedDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Daily / Weekly Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          {(['daily', 'weekly'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-150 ${viewMode === mode
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <>
          <StatsSkeleton />
          <div className="responsive-grid-tablet">
            <div className="space-y-4">
              <HabitSkeleton />
              <HabitSkeleton />
              <HabitSkeleton />
            </div>
            <div className="space-y-4">
              <div className="card h-64" />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Clock, value: format(new Date(selectedDate), 'MMM d'), label: 'Date', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { icon: Target, value: `${completionRate.toFixed(0)}%`, label: 'Consistency', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { icon: CheckCircle2, value: `${completedHabitsCount}/${scheduledHabits.length}`, label: 'Completed', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { icon: Target, value: `${scheduledHabits.length - completedHabitsCount}`, label: 'Remaining', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card flex flex-col items-start gap-1"
              >
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{stat.value}</p>
                  <div className={`w-1.5 h-1.5 rounded-full ${stat.value.includes('0%') ? 'bg-gray-200' : 'bg-indigo-500'}`} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* WhatsApp Poll (Premium Action) */}
          <div className="mb-10">
            <div className="p-1 px-1 bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-[24px]">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white dark:bg-zinc-900/40 rounded-[20px] shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <MessageCircle size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 normal-case tracking-tight">Sync Activity to WhatsApp</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Track progress via magic link</p>
                  </div>
                </div>
                <button
                  onClick={sendDailyPoll}
                  disabled={sendingPoll}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-60 active:scale-95"
                >
                  {sendingPoll ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {sendingPoll ? 'Syncing...' : 'Send Magic Link'}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Grid (Fluid 12-cols) */}
          <div className="grid grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
            {/* Left Column — Habit List */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">
                  {viewMode === 'weekly' ? 'Week View' : "Active Routine"}
                </h3>
                <button
                  onClick={() => router.push('/dashboard/habits')}
                  className="px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  Manage Habits
                </button>
              </div>

              {viewMode === 'weekly' ? (
                <WeeklyCalendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  completionData={getWeeklyCompletionData()}
                />
              ) : (
                <UnifiedHabitList
                  habits={scheduledHabits}
                  logs={logs}
                  selectedDate={selectedDate}
                  onToggle={handleToggle}
                  onSettingsSave={handleSettingsSave}
                  userWhatsAppNumber={userWhatsAppNumber}
                  userWhatsAppAutomation={userWhatsAppAutomation}
                  onGlobalWhatsAppToggle={handleGlobalWhatsAppToggle}
                />
              )}
            </div>

            {/* Right Column — Sidebar */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
              <div className="sticky top-20 space-y-6">
                <div className="card-premium p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Insights</h3>
                  <HabitStats habits={habits} logs={logs} />
                </div>
                <div className="card-premium p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Milestones</h3>
                  <AchievementBadges />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
