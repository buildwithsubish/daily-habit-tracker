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
import { Target, CheckCircle2, Calendar, Bell, BellOff, ArrowDown, Sparkles } from 'lucide-react';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { HabitSkeleton, StatsSkeleton } from '@/components/Skeleton';
import { toast } from 'react-hot-toast';
import { useHiddenMode } from '@/context/HiddenModeContext';
import HealthStatusCard from '@/components/HealthStatusCard';
import ProfileSetupModal from '@/components/ProfileSetupModal';
import MonthlyWeightCheckin from '@/components/MonthlyWeightCheckin';
import { triggerNotification, requestNotificationPermission } from '@/lib/notifications';
import { Dumbbell } from 'lucide-react';
import EarnedAppreciationBanner, { EarnedAppreciationData } from '@/components/EarnedAppreciationBanner';

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
  const [celebration, setCelebration] = useState<{
    isOpen: boolean;
    type: '7-day' | '30-day' | 'daily' | 'custom-streak' | 'achievement';
    data?: {
      streak?: number;
      habitName?: string;
      achievementTitle?: string;
      achievementDesc?: string;
      achievementIcon?: string;
      achievementPoints?: number;
      achievementTier?: string;
    };
  }>({
    isOpen: false,
    type: '7-day',
  });
  const [earnedAppreciation, setEarnedAppreciation] = useState<EarnedAppreciationData | null>(null);
  const [showEarnedAppreciation, setShowEarnedAppreciation] = useState(true);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [preferencesConfigured, setPreferencesConfigured] = useState(true);
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
      const isConfigured = localStorage.getItem('preferences-configured') === 'true';
      setPreferencesConfigured(isConfigured);
      setReminderPermission('Notification' in window ? Notification.permission : 'unsupported');
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time');
    } catch { /* keep safe defaults */ }
    const loadData = async () => {
      await Promise.all([fetchHabits(), fetchUser(), fetchProfile(), fetchAchievements()]);
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
        if (response.status === 401) {
          router.push('/login');
          return;
        }
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

  const handleSaveDashboardReminder = async (newEnabled: boolean, newTime: string) => {
    setReminderEnabled(newEnabled);
    setReminderTime(newTime);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderEnabled: newEnabled, reminderTime: newTime }),
      });
      if (!response.ok) throw new Error('Reminder settings could not be saved');
      localStorage.setItem('habit-reminder', JSON.stringify({ enabled: newEnabled, time: newTime }));
      localStorage.setItem('preferences-configured', 'true');
      setPreferencesConfigured(true);
      setReminderSyncError(false);
      toast.success(newEnabled ? `Daily check-in set for ${newTime}!` : 'Reminder turned off');
    } catch {
      setReminderSyncError(true);
      toast.error('Reminder settings could not be synced');
    }
  };

  useEffect(() => {
    if (!hasMounted) return;

    const checkAllReminders = () => {
      const activeZone = timeZone || (typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata') || 'Asia/Kolkata';

      // Accurately calculate date and minute in user's configured timezone (e.g. Asia/Kolkata)
      let today: string;
      let currentMinute: number;
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: activeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(new Date());
        const map: Record<string, string> = {};
        for (const p of parts) map[p.type] = p.value;
        today = `${map.year}-${map.month}-${map.day}`;
        currentMinute = parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10);
      } catch {
        const now = new Date();
        today = format(now, 'yyyy-MM-dd');
        currentMinute = now.getHours() * 60 + now.getMinutes();
      }

      // Check audio sound setting from localStorage
      const soundPref = localStorage.getItem('habit-reminder-sound');
      const shouldPlaySound = soundPref === null ? true : soundPref === 'true';

      // 1. Check general daily reminder if enabled
      if (reminderEnabled) {
        const [hour, minute] = reminderTime.split(':').map(Number);
        const dueMinute = hour * 60 + minute;
        if (currentMinute >= dueMinute && localStorage.getItem('habit-reminder-last') !== today) {
          const todaysHabits = habits.filter(habit => habit.active !== false && isHabitScheduled(habit, today));
          const hasIncompleteHabit = todaysHabits.some(habit => !isHabitCompleteOnDate(habit, today));
          
          if (hasIncompleteHabit) {
            localStorage.setItem('habit-reminder-last', today);
            triggerNotification({
              title: '⏰ Daily Habit Check-in',
              body: 'Take a calm moment to mark today’s progress. Every small step counts.',
              tag: `habit-check-in-${today}`,
              playSound: shouldPlaySound,
              onClick: () => router.push('/dashboard'),
            });
            toast('⏰ Daily Check-in: Take a moment to record your habits today!', {
              icon: '🎯',
              duration: 6000,
            });
          }
        }
      }

      // 2. Check individual habit reminders
      for (const habit of habits) {
        if (habit.active === false || !habit.reminderEnabled || !habit.reminderTime) continue;
        if (!isHabitScheduled(habit, today)) continue;
        if (isHabitCompleteOnDate(habit, today)) continue;

        const [hHour, hMinute] = habit.reminderTime.split(':').map(Number);
        const hDueMinute = hHour * 60 + hMinute;
        const habitAlertKey = `habit-reminder-${habit.id}-${today}`;

        if (currentMinute >= hDueMinute && !localStorage.getItem(habitAlertKey)) {
          localStorage.setItem(habitAlertKey, 'sent');
          triggerNotification({
            title: `🎯 Time for: ${habit.name}`,
            body: habit.description || `Don't break your streak! Time to complete ${habit.name}.`,
            tag: `habit-item-${habit.id}-${today}`,
            playSound: shouldPlaySound,
            onClick: () => router.push('/dashboard'),
          });
          toast(`🎯 Reminder: Time to complete "${habit.name}"!`, {
            icon: '⚡',
            duration: 6000,
          });
        }
      }
    };

    checkAllReminders();
    const intervalTimer = window.setInterval(checkAllReminders, 30_000);

    // Also check immediately when tab becomes visible (iOS Safari sleep/wake)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAllReminders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hasMounted, reminderEnabled, reminderTime, habits, completedStepsByHabitDate, router]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username || '');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.status === 401) return;
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
        if (data.timeZone && data.timeZone !== 'UTC') {
          setTimeZone(data.timeZone);
        } else {
          setTimeZone(detectedZone);
        }
        if (typeof data.reminderEnabled === 'boolean') setReminderEnabled(data.reminderEnabled);
        if (typeof data.reminderTime === 'string') {
          const match = data.reminderTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
          if (match) setReminderTime(`${match[1].padStart(2, '0')}:${match[2]}`);
        }
        if (data.reminderTime || data.reminderEnabled || localStorage.getItem('preferences-configured') === 'true') {
          setPreferencesConfigured(true);
        }
        setReminderPreferencesLoaded(true);
        setReminderSyncError(false);
      }
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
        return [];
      }
      if (!res.ok) throw new Error('Failed to fetch habits');
      const data = await res.json();
      const list = data.habits || [];
      setHabits(list);
      return list;
    } catch (error) {
      console.error('Failed to fetch habits:', error);
      setHabitsError(true);
      return [];
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await fetch('/api/achievements');
      if (res.status === 401) return [];
      if (res.ok) {
        const data = await res.json();
        const achs = data.achievements || [];
        setAchievements(achs);
        return achs;
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
    return [];
  };

  const fetchLogs = async () => {
    try {
      const selectedWeekStart = startOfWeek(new Date(`${selectedDate}T12:00:00`), { weekStartsOn: 1 });
      const weekStart = format(selectedWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(addDays(selectedWeekStart, 6), 'yyyy-MM-dd');
      const boundedWeekEnd = weekEnd > getToday() ? getToday() : weekEnd;
      const res = await fetch(`/api/logs?startDate=${weekStart}&endDate=${boundedWeekEnd}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
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
        if (result.dailyAllDone) {
          setCelebration({
            isOpen: true,
            type: 'daily',
            data: { streak: newStreak, habitName: habit.name },
          });
          toast.success('⭐ 100% daily rituals completed! Outstanding work.');
        } else if (newStreak === 3 || newStreak === 7 || newStreak === 14 || newStreak === 21 || newStreak === 30 || newStreak === 50 || newStreak === 100) {
          setCelebration({
            isOpen: true,
            type: newStreak === 30 ? '30-day' : newStreak === 7 ? '7-day' : 'custom-streak',
            data: { streak: newStreak, habitName: habit.name },
          });
          toast.success(`🔥 ${newStreak}-day streak maintained on "${habit.name}"!`);
        }

        // Check if completing this habit unlocked any achievements
        fetchAchievements().then(updatedAchs => {
          if (Array.isArray(updatedAchs)) {
            const newlyUnlocked = updatedAchs.find(a => a.achieved && !a.celebrated);
            if (newlyUnlocked) {
              setCelebration({
                isOpen: true,
                type: 'achievement',
                data: {
                  achievementTitle: newlyUnlocked.title,
                  achievementDesc: newlyUnlocked.description,
                  achievementIcon: newlyUnlocked.icon,
                  achievementPoints: newlyUnlocked.points,
                },
              });
              toast.success(`🏆 Achievement Unlocked: ${newlyUnlocked.title} (+${newlyUnlocked.points} pts)!`);
            }
          }
        });
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

  // Dynamically evaluate earned appreciation (Maintained habits/streaks & Completed achievements)
  useEffect(() => {
    if (!hasMounted) return;
    const today = getToday();

    // 1. Prioritize newly unlocked and uncelebrated achievements
    const uncelebratedAch = achievements.find(a => a.achieved && !a.celebrated);
    if (uncelebratedAch) {
      setEarnedAppreciation({
        id: `ach-${uncelebratedAch.id}`,
        type: 'achievement',
        emoji: uncelebratedAch.icon || '🏆',
        badgeTag: `Achievement Unlocked • +${uncelebratedAch.points} PTS`,
        title: `Achievement Unlocked: ${uncelebratedAch.title}`,
        message: `${uncelebratedAch.description} Outstanding accomplishment!`,
        achievementId: uncelebratedAch.id,
        actionUrl: '/dashboard/achievements',
        actionText: 'View Milestones',
      });
      setShowEarnedAppreciation(true);
      return;
    }

    // 2. Check if today's scheduled habits are 100% maintained/completed
    const scheduledToday = habits.filter(h => isHabitScheduled(h, today));
    if (scheduledToday.length > 0) {
      const allDoneToday = scheduledToday.every(h => isHabitCompleteOnDate(h, today));
      if (allDoneToday) {
        const isDismissed = localStorage.getItem(`earned-apprec-daily-${today}`);
        if (!isDismissed) {
          setEarnedAppreciation({
            id: `daily-${today}`,
            type: 'daily-completed',
            emoji: '⭐',
            badgeTag: '100% Rituals Maintained Today',
            title: 'All Scheduled Habits Completed!',
            message: `You've maintained every scheduled habit for today (${scheduledToday.length}/${scheduledToday.length}). Consistency turns small daily actions into massive results.`,
          });
          setShowEarnedAppreciation(true);
          return;
        }
      }
    }

    // 3. Check for maintained active streaks (>= 3 days) completed today
    const habitsWithStreak = habits
      .filter(h => (h.streak || 0) >= 3 && isHabitCompleteOnDate(h, today))
      .sort((a, b) => (b.streak || 0) - (a.streak || 0));

    if (habitsWithStreak.length > 0) {
      const topStreakHabit = habitsWithStreak[0];
      const isDismissed = localStorage.getItem(`earned-apprec-streak-${today}-${topStreakHabit.id}`);
      if (!isDismissed) {
        setEarnedAppreciation({
          id: `streak-${topStreakHabit.id}-${today}`,
          type: 'streak-maintained',
          emoji: '🔥',
          badgeTag: `${topStreakHabit.streak}-Day Streak Maintained`,
          title: `${topStreakHabit.streak}-Day Consistency on "${topStreakHabit.name}"`,
          message: `You've kept your ${topStreakHabit.streak}-day streak alive today. Consistency builds mastery!`,
        });
        setShowEarnedAppreciation(true);
        return;
      }
    }

    // Never show generic or placeholder quotes
    setEarnedAppreciation(null);
  }, [hasMounted, habits, logs, achievements, completedStepsByHabitDate]);

  const handleDismissEarnedAppreciation = async () => {
    if (!earnedAppreciation) return;
    const today = getToday();

    if (earnedAppreciation.type === 'achievement' && earnedAppreciation.achievementId) {
      try {
        await fetch('/api/achievements/celebrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementId: earnedAppreciation.achievementId }),
        });
        setAchievements(prev =>
          prev.map(a => a.id === earnedAppreciation.achievementId ? { ...a, celebrated: true } : a)
        );
      } catch (err) {
        console.error('Failed to mark achievement celebrated:', err);
      }
    } else if (earnedAppreciation.type === 'daily-completed') {
      try {
        localStorage.setItem(`earned-apprec-daily-${today}`, 'true');
      } catch {}
    } else if (earnedAppreciation.type === 'streak-maintained') {
      try {
        localStorage.setItem(`earned-apprec-streak-${today}-${earnedAppreciation.id}`, 'true');
      } catch {}
    }

    setShowEarnedAppreciation(false);
    setEarnedAppreciation(null);
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
        data={celebration.data}
      />

      {/* Earned Appreciation Banner (Maintained Streaks & Completed Achievements) */}
      <AnimatePresence>
        {earnedAppreciation && showEarnedAppreciation && (
          <EarnedAppreciationBanner
            appreciation={earnedAppreciation}
            onDismiss={handleDismissEarnedAppreciation}
          />
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

          {/* Monthly Weight Check-in (Prompted once every 30 days to avoid daily fatigue) */}
          <MonthlyWeightCheckin
            currentWeight={userProfile?.weight}
            lastWeightUpdate={userProfile?.lastWeightUpdate}
            onWeightSaved={(newWeight) => {
              setUserProfile((prev: any) => ({
                ...prev,
                weight: newWeight,
                lastWeightUpdate: new Date().toISOString(),
              }));
              fetchProfile();
            }}
          />

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

          {!preferencesConfigured && (
            <details className="mb-7 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">{reminderEnabled ? <Bell size={17}/> : <BellOff size={17}/>}</span><span><span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Daily check-in</span><span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">{reminderEnabled ? `One reminder at ${reminderTime}` : 'Choose one time for a gentle reminder'}</span></span></span>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Reminder settings</span>
              </summary>
              <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Reminder time<input aria-label="Reminder time" type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"/></label>
                  <button onClick={async () => { const nextEnabled = !reminderEnabled; if (nextEnabled) { const permission = await requestNotificationPermission(); setReminderPermission(permission); } await handleSaveDashboardReminder(nextEnabled, reminderTime); }} className={`min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${reminderEnabled ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800' : 'bg-indigo-900 text-white hover:bg-indigo-800 dark:bg-indigo-200 dark:text-slate-950 dark:hover:bg-indigo-100'}`}>{reminderEnabled ? 'Turn off reminder' : 'Set reminder'}</button>
                </div>
                  <div className="max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400"><p>Choose a time that follows something you already do, like breakfast or winding down. Time zone: {timeZone || 'your device’s local time'}. The reminder works while this app is open.</p>{reminderPermission === 'denied' && <p className="mt-1 text-amber-700 dark:text-amber-400">Browser notifications are blocked; you’ll see an in-app reminder while this page is open.</p>}</div>
              </div>
            </details>
          )}

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
