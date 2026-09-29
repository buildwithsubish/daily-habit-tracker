'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Habit, DailyLog, WorkoutData } from '@/types';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import AchievementBadges from '@/components/AchievementBadges';
import HabitStats from '@/components/HabitStats';
import StreakCelebration from '@/components/StreakCelebration';
import UnifiedHabitList from '@/components/UnifiedHabitList';
import { getToday, isHabitScheduled } from '@/lib/utils';
import { Target, CheckCircle2, X, Calendar, Bell, BellOff, ArrowDown, Sparkles } from 'lucide-react';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { HabitSkeleton, StatsSkeleton } from '@/components/Skeleton';
import { toast } from 'react-hot-toast';
import { useHiddenMode } from '@/context/HiddenModeContext';
import HealthStatusCard from '@/components/HealthStatusCard';
import ProfileSetupModal from '@/components/ProfileSetupModal';

export default function DashboardPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const completedStepsByHabitDate = useMemo(() => {
    const index = new Map<string, Set<number | null>>();
    for (const log of logs) {
      if (!log.completed) continue;
      const key = `${log.habitId}:${log.date}`;
      if (!index.has(key)) index.set(key, new Set());
      index.get(key)!.add(log.stepIndex ?? null);
    }
    return index;
  }, [logs]);
  const isHabitCompleteOnDate = (habit: Habit, date: string) => {
    const completedSteps = completedStepsByHabitDate.get(`${habit.id}:${date}`);
    if (!completedSteps) return false;
    if (habit.type === 'single-step') return completedSteps.has(null);
    return habit.steps.every((_, index) => completedSteps.has(index));
  };
  const [loading, setLoading] = useState(true);
  const [habitsError, setHabitsError] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const [logsRetry, setLogsRetry] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [hasMounted, setHasMounted] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderPreferencesLoaded, setReminderPreferencesLoaded] = useState(false);
  const [reminderPermission, setReminderPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [reminderSyncError, setReminderSyncError] = useState(false);
  const [timeZone, setTimeZone] = useState('');
  const [celebration, setCelebration] = useState<{ isOpen: boolean; type: '7-day' | '30-day' | 'daily' }>({
    isOpen: false,
    type: '7-day',
  });
  const [appreciation, setAppreciation] = useState<{ emoji: string; message: string } | null>(null);
  const [showAppreciation, setShowAppreciation] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    setHasMounted(true);
    try {
      const saved = localStorage.getItem('habit-reminder');
      if (saved) {
        const parsed = JSON.parse(saved);
        setReminderEnabled(Boolean(parsed.enabled));
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.time)) setReminderTime(parsed.time);
      }
      setReminderPermission('Notification' in window ? Notification.permission : 'unsupported');
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time');
    } catch { /* keep safe defaults */ }
    const loadData = async () => {
      await Promise.all([fetchHabits(), fetchUser(), fetchAppreciation(), fetchProfile()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const selectedWeekStart = startOfWeek(new Date(`${selectedDate}T12:00:00`), { weekStartsOn: 1 });
    const weekStart = format(selectedWeekStart, 'yyyy-MM-dd');
    const weekEnd = format(addDays(selectedWeekStart, 6), 'yyyy-MM-dd');
    const boundedWeekEnd = weekEnd > getToday() ? getToday() : weekEnd;
    setLogsError(false);
    setLogs([]);
    fetch(`/api/logs?startDate=${weekStart}&endDate=${boundedWeekEnd}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch history');
        setLogs(data.logs || []);
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch logs:', error);
          setLogsError(true);
        }
      });
    return () => controller.abort();
  }, [selectedDate, logsRetry]);

  useEffect(() => {
    if (hasMounted) localStorage.setItem('habit-reminder', JSON.stringify({ enabled: reminderEnabled, time: reminderTime }));
  }, [hasMounted, reminderEnabled, reminderTime]);

  useEffect(() => {
    if (!reminderPreferencesLoaded) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderEnabled, reminderTime }),
        });
        if (!response.ok) throw new Error('Reminder settings could not be saved');
        setReminderSyncError(false);
      } catch {
        setReminderSyncError(true);
        toast.error('Reminder settings could not be synced to your account');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [reminderPreferencesLoaded, reminderEnabled, reminderTime]);

  useEffect(() => {
    if (!reminderEnabled || !hasMounted) return;
    const checkReminder = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const [hour, minute] = reminderTime.split(':').map(Number);
      const dueMinute = hour * 60 + minute;
      if (currentMinute < dueMinute || localStorage.getItem('habit-reminder-last') === today) return;
      const todaysHabits = habits.filter(habit => habit.active !== false && isHabitScheduled(habit, today));
      const hasIncompleteHabit = todaysHabits.some(habit => !isHabitCompleteOnDate(habit, today));
      if (!hasIncompleteHabit) return;

      localStorage.setItem('habit-reminder-last', today);
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification('A gentle habit check-in', {
            body: 'Take a moment to mark today’s progress. Every small step counts.',
            tag: `habit-check-in-${today}`,
          });
          notification.onclick = () => {
            window.focus();
            router.push('/dashboard');
            notification.close();
          };
        } catch {
          toast('A gentle check-in: take a moment to mark today’s progress.');
        }
      } else {
        toast('A gentle check-in: take a moment to mark today’s progress.');
      }
    };
    checkReminder();
    const timer = window.setInterval(checkReminder, 30_000);
    return () => window.clearInterval(timer);
  }, [hasMounted, reminderEnabled, reminderTime, habits, completedStepsByHabitDate, router]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username || '');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
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

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      if (typeof data.reminderEnabled === 'boolean') setReminderEnabled(data.reminderEnabled);
      if (typeof data.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime)) setReminderTime(data.reminderTime);
        setReminderPreferencesLoaded(true);
      } else setReminderSyncError(true);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
};

  const fetchHabits = async () => {
    try {
      setHabitsError(false);
      const res = await fetch('/api/habits');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch habits');
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (error) {
      console.error('Failed to fetch habits:', error);
      setHabitsError(true);
    }
  };

  const fetchLogs = async () => {
    try {
      const selectedWeekStart = startOfWeek(new Date(`${selectedDate}T12:00:00`), { weekStartsOn: 1 });
      const weekStart = format(selectedWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(addDays(selectedWeekStart, 6), 'yyyy-MM-dd');
      const boundedWeekEnd = weekEnd > getToday() ? getToday() : weekEnd;
      const res = await fetch(`/api/logs?startDate=${weekStart}&endDate=${boundedWeekEnd}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const handleToggle = async (habitId: string, stepIndex?: number, activityNote?: string, subActivities?: any[], workoutData?: WorkoutData) => {
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
        workoutData,
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
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          activityNote: activityNote || undefined,
          subActivities: subActivities || undefined,
          workoutData: workoutData || undefined,
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


  const getHabitCompletion = (habitId: string, date: string = selectedDate) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return false;
    return isHabitCompleteOnDate(habit, date);
  };

  const getStepCompletions = (habitId: string, date: string = selectedDate) => {
    return [...(completedStepsByHabitDate.get(`${habitId}:${date}`) || [])]
      .filter((stepIndex): stepIndex is number => stepIndex !== null)
      .sort((a, b) => a - b);
  };

  const selectHistoryDate = (date: string) => {
    if (date > getToday()) return;
    setSelectedDate(date);
  };

  const { isHiddenMode } = useHiddenMode();

  const scheduledHabits = habits.filter(h => (h.active !== false) && isHabitScheduled(h, selectedDate));
  const filteredHabits = scheduledHabits.filter(h => !h.hidden || isHiddenMode);
  const completedHabitsCount = filteredHabits.filter(h => getHabitCompletion(h.id)).length;

  const completionRate = filteredHabits.length > 0
    ? (completedHabitsCount / filteredHabits.length) * 100
    : 0;
  const nextHabit = filteredHabits.find(habit => !getHabitCompletion(habit.id));
  const isToday = selectedDate === getToday();

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = username ? `, ${username}` : '';
    if (hour < 12) return `Good morning${name}`;
    if (hour < 18) return `Good afternoon${name}`;
    return `Good evening${name}`;
  };

  const getWeeklyCompletionData = () => {
    const weekStart = startOfWeek(new Date(`${selectedDate}T12:00:00`), { weekStartsOn: 1 });
    const completionData: Record<string, { completed: number; total: number }> = {};

    for (let i = 0; i < 7; i++) {
      const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const scheduledForDay = habits.filter(h => h.active !== false && (!h.hidden || isHiddenMode) && isHabitScheduled(h, dateStr));
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
    <div className="mx-auto max-w-7xl pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-10">
      <StreakCelebration
        isOpen={celebration.isOpen}
        onClose={() => setCelebration({ ...celebration, isOpen: false })}
        type={celebration.type}
      />

      {/* Appreciation banner */}
      <AnimatePresence>
        {appreciation && showAppreciation && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6"
          >
            <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-[#f2f1ff] px-4 py-3 text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-50 sm:px-5">
              <div className="relative flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-lg dark:bg-white/10">
                  {appreciation.emoji}
                </div>
                <p className="flex-1 text-sm font-medium leading-relaxed">{appreciation.message}</p>
                <button
                  onClick={() => setShowAppreciation(false)}
                  aria-label="Dismiss message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-indigo-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">A little progress, each day</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
            {getGreeting()}
          </h1>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Calendar size={15} aria-hidden="true" />
            <p className="text-sm font-medium">
              {format(new Date(`${selectedDate}T12:00:00`), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Dashboard view">
          {(['daily', 'weekly'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${viewMode === mode
                ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-400/15 dark:text-indigo-100'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <>
          <StatsSkeleton />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)]">
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
          {habitsError && <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"><span>Habit list could not be loaded. Check your connection and try again.</span><button onClick={() => { void fetchHabits(); }} className="min-h-11 rounded-lg border border-rose-300 px-3 font-semibold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/50">Try again</button></div>}
          {logsError && <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"><span>Habit history for this week could not be loaded.</span><button onClick={() => setLogsRetry(value => value + 1)} className="min-h-11 rounded-lg border border-rose-300 px-3 font-semibold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/50">Try again</button></div>}
          {viewMode === 'weekly' && (
            <WeeklyCalendar
              selectedDate={selectedDate}
              onDateSelect={selectHistoryDate}
              completionData={getWeeklyCompletionData()}
            />
          )}
          {selectedDate < format(subDays(new Date(`${getToday()}T12:00:00`), 7), 'yyyy-MM-dd') && viewMode === 'weekly' && (
            <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="status">
              This date is older than the 7-day editing window. You can review its history, but progress is read-only.
            </p>
          )}

          {/* One clear daily progress summary */}
          <section aria-label="Daily progress" className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.72fr)]">
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 dark:text-indigo-300">{isToday ? 'Today’s progress' : 'Progress for this day'}</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                      {filteredHabits.length === 0 ? 'A clear day' : completedHabitsCount === filteredHabits.length ? 'You showed up for yourself' : 'Keep it small. Keep it moving.'}
                    </h2>
                    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {filteredHabits.length === 0 ? 'There are no habits scheduled for this date.' : completedHabitsCount === filteredHabits.length ? 'Everything planned for this day is complete. Let that be enough.' : `${completedHabitsCount} of ${filteredHabits.length} planned ${filteredHabits.length === 1 ? 'habit' : 'habits'} complete. One step is a good place to begin.`}
                    </p>
                  </div>
                  <div className="min-w-[84px] text-right">
                    <p className="text-3xl font-semibold leading-none tracking-tight text-slate-950 tabular-nums dark:text-white">{completionRate.toFixed(0)}<span className="text-xl">%</span></p>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">complete</p>
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="Daily completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(completionRate)}>
                  <div className="h-full rounded-full bg-indigo-700 transition-[width] duration-500 dark:bg-indigo-300" style={{ width: `${completionRate}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{completedHabitsCount} completed</span><span>{filteredHabits.length - completedHabitsCount} to go</span>
                </div>
              </div>
              <div className="flex flex-col justify-center border-t border-slate-200 bg-[#fbfaf7] p-5 dark:border-slate-800 dark:bg-slate-950/50 sm:p-6 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><Sparkles size={14} className="text-indigo-700 dark:text-indigo-300"/> {nextHabit ? 'A gentle next step' : 'A note for today'}</div>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{nextHabit ? nextHabit.name : filteredHabits.length ? 'You’ve completed your plan.' : 'Make space for what matters.'}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{nextHabit ? 'Start with this one. You can decide what comes after.' : filteredHabits.length ? 'Consistency includes knowing when you are done.' : 'Add a small, realistic habit whenever you’re ready.'}</p>
                {nextHabit ? <a href="#todays-routine" className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-indigo-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-200 dark:text-slate-950 dark:hover:bg-indigo-100">Continue routine <ArrowDown size={15}/></a> : filteredHabits.length ? <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-300"><CheckCircle2 size={17}/> Plan complete</span> : null}
              </div>
            </div>
          </section>

          <details className="mb-7 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">{reminderEnabled ? <Bell size={17}/> : <BellOff size={17}/>}</span><span><span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Daily check-in</span><span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">{reminderEnabled ? `One reminder at ${reminderTime}` : 'Choose one time for a gentle reminder'}</span></span></span>
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Reminder settings</span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Reminder time<input aria-label="Reminder time" type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"/></label>
                <button onClick={async () => { if (!reminderEnabled && 'Notification' in window && Notification.permission === 'default') { try { const permission = await Notification.requestPermission(); setReminderPermission(permission); } catch { setReminderPermission('denied'); } } setReminderEnabled(!reminderEnabled); }} className={`min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${reminderEnabled ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800' : 'bg-indigo-900 text-white hover:bg-indigo-800 dark:bg-indigo-200 dark:text-slate-950 dark:hover:bg-indigo-100'}`}>{reminderEnabled ? 'Turn off reminder' : 'Set reminder'}</button>
              </div>
                <div className="max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400"><p>Choose a time that follows something you already do, like breakfast or winding down. Time zone: {timeZone || 'your device’s local time'}. The reminder works while this app is open.</p>{reminderPermission === 'denied' && <p className="mt-1 text-amber-700 dark:text-amber-400">Browser notifications are blocked; you’ll see an in-app reminder while this page is open.</p>}</div>
            </div>
          </details>
          {reminderSyncError && <p className="-mt-5 mb-6 text-xs text-amber-800 dark:text-amber-300" role="status">Your reminder is active on this device, but account sync failed. Open Settings and save again when you’re back online.</p>}

          {/* Main Content Grid (Fluid 12-cols) */}
          <div className="grid grid-cols-12 items-start gap-5 lg:gap-7">
            {/* Left Column — Habit List */}
            <div className="col-span-12 space-y-4 lg:col-span-8 xl:col-span-9">
              <div id="todays-routine" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                <h3 className="text-base font-semibold normal-case tracking-normal text-slate-900 dark:text-slate-100">
                  {viewMode === 'weekly' ? 'Your week' : isToday ? "Today’s routine" : `${format(new Date(`${selectedDate}T12:00:00`), 'EEEE')}’s routine`}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{viewMode === 'weekly' ? 'Choose a day to review its progress.' : nextHabit ? `Begin with ${nextHabit.name}, then take the next step when you’re ready.` : filteredHabits.length ? 'You have completed everything scheduled for this day.' : 'No habits scheduled for this day.'}</p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/habits')}
                  className="min-h-11 self-start rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-indigo-200 sm:self-auto"
                >
                  Manage Habits
                </button>
              </div>

              {filteredHabits.length ? (
                <UnifiedHabitList
                  habits={filteredHabits}
                  logs={logs}
                  selectedDate={selectedDate}
                  onToggle={handleToggle}
                  readOnly={selectedDate < format(subDays(new Date(`${getToday()}T12:00:00`), 7), 'yyyy-MM-dd')}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"><Target size={20}/></div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">A lighter day is still part of the rhythm.</p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">There’s nothing scheduled here. Add or adjust a habit if you want a small next step.</p>
                  <button onClick={() => router.push('/dashboard/habits')} className="mt-4 min-h-11 rounded-lg bg-indigo-900 px-4 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-200 dark:text-slate-950 dark:hover:bg-indigo-100">Manage habits</button>
                </div>
              )}
            </div>

            {/* Right Column — Sidebar */}
            <div className="col-span-12 space-y-4 lg:col-span-4 xl:col-span-3">
              <div className="space-y-4 lg:sticky lg:top-20">
                <HealthStatusCard onSetupRequest={() => setShowProfileSetup(true)} logs={logs} />
                <div className="card-premium p-5 sm:p-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Insights</h3>
                  <HabitStats habits={habits} logs={logs} />
                </div>
                <div className="card-premium p-5 sm:p-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Milestones</h3>
                  <AchievementBadges />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Profile Setup Modal */}
      <ProfileSetupModal 
        isOpen={showProfileSetup} 
        onClose={() => setShowProfileSetup(false)} 
        onSuccess={() => {
          fetchProfile();
          window.location.reload(); // Refresh to update all components relying on profile
        }}
        initialData={userProfile}
      />
    </div>
  );
}
