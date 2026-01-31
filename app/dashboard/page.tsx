'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Habit, DailyLog } from '@/types';
import HabitCard from '@/components/HabitCard';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import AchievementBadges from '@/components/AchievementBadges';
import HabitStats from '@/components/HabitStats';
import StreakCelebration from '@/components/StreakCelebration';
import { getToday, isHabitScheduled } from '@/lib/utils';
import { ListTodo, Sparkles, ChevronRight, Zap, Target, Clock, CheckCircle2, Info } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { HabitSkeleton, StatsSkeleton } from '@/components/Skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [hasMounted, setHasMounted] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [celebration, setCelebration] = useState<{ isOpen: boolean; type: '7-day' | '30-day' | 'daily' }>({
    isOpen: false,
    type: '7-day',
  });

  useEffect(() => {
    setHasMounted(true);
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHabits(), fetchLogs(), fetchUser()]);
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
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
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

  const handleToggle = async (habitId: string, stepIndex?: number) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const existingLog = logs.find(
      log => log.habitId === habitId && 
      log.date === selectedDate &&
      (habit.type === 'single-step' ? (log.stepIndex === null || log.stepIndex === undefined) : log.stepIndex === stepIndex)
    );

    const completed = !existingLog?.completed;

    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          date: selectedDate,
          stepIndex: stepIndex ?? null,
          completed,
        }),
      });

      if (res.ok && completed) {
        if (selectedDate === getToday()) {
          const result = await res.json();
          const newStreak = result.streak;
          
          if (newStreak === 7) setCelebration({ isOpen: true, type: '7-day' });
          else if (newStreak === 30) setCelebration({ isOpen: true, type: '30-day' });
          else {
            const updatedLogsRes = await fetch(`/api/logs?date=${getToday()}`);
            const updatedLogsData = await updatedLogsRes.json();
            const updatedLogs = updatedLogsData.logs || [];
            
            const scheduledToday = habits.filter(h => isHabitScheduled(h, getToday()));
            
            const isHabitDone = (h: Habit, currentLogs: DailyLog[]) => {
              if (h.type === 'single-step') {
                return currentLogs.some(l => l.habitId === h.id && l.completed && (l.stepIndex === null || l.stepIndex === undefined));
              } else {
                const completedSteps = currentLogs.filter(l => l.habitId === h.id && l.completed && l.stepIndex !== null && l.stepIndex !== undefined).length;
                return completedSteps === h.steps.length;
              }
            };

            const allDone = scheduledToday.length > 0 && scheduledToday.every(h => isHabitDone(h, updatedLogs));
            if (allDone) {
              setCelebration({ isOpen: true, type: 'daily' });
            }
          }
        }
      }

      fetchLogs();
      fetchHabits();
    } catch (error) {
      console.error('Failed to update log:', error);
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

  const scheduledHabits = habits.filter(h => isHabitScheduled(h, selectedDate));
  const completedHabitsCount = scheduledHabits.filter(h => getHabitCompletion(h.id)).length;

  const completionRate = scheduledHabits.length > 0
    ? (completedHabitsCount / scheduledHabits.length) * 100
    : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = username ? `, ${username}` : '';
    if (hour < 12) return `Good morning${name}!`;
    if (hour < 18) return `Good afternoon${name}!`;
    return `Good evening${name}!`;
  };

  const getNudge = () => {
    if (scheduledHabits.length === 0) return "Want to start with the easiest habit?";
    if (completedHabitsCount === 0) return "Even 1 minute counts today. Small steps lead to big change.";
    if (completedHabitsCount < scheduledHabits.length) return "Just one small action keeps your streak alive.";
    return "Nice work showing up again! You're crushing it.";
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
        <StreakCelebration 
          isOpen={celebration.isOpen} 
          onClose={() => setCelebration({ ...celebration, isOpen: false })} 
          type={celebration.type} 
        />

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-8 md:mb-12"
        >
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
              </div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-medium">
              {getNudge()}
            </p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl w-fit"
          >
            {(['daily', 'weekly'] as const).map((mode) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode(mode)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  viewMode === mode 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {mode}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {loading ? (
          <>
            <StatsSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <HabitSkeleton />
                <HabitSkeleton />
                <HabitSkeleton />
              </div>
              <div className="space-y-4">
                <div className="modern-card h-64" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Stats Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
            >
              {[
                { icon: Clock, value: format(new Date(selectedDate), 'MMM d'), label: 'Today', bgGradient: 'from-blue-400/20 to-blue-600/20', iconGradient: 'from-blue-500 to-blue-600', iconShadow: 'shadow-blue-500/30' },
                { icon: Target, value: `${completionRate.toFixed(0)}%`, label: 'Completion', bgGradient: 'from-indigo-400/20 to-indigo-600/20', iconGradient: 'from-indigo-500 to-indigo-600', iconShadow: 'shadow-indigo-500/30' },
                { icon: Zap, value: `${completedHabitsCount}/${scheduledHabits.length}`, label: 'Done', bgGradient: 'from-purple-400/20 to-purple-600/20', iconGradient: 'from-purple-500 to-purple-600', iconShadow: 'shadow-purple-500/30' },
                { icon: CheckCircle2, value: `${scheduledHabits.length - completedHabitsCount}`, label: 'Remaining', bgGradient: 'from-pink-400/20 to-pink-600/20', iconGradient: 'from-pink-500 to-pink-600', iconShadow: 'shadow-pink-500/30' },
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-2xl`} />
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.iconGradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg ${stat.iconShadow}`}>
                    <stat.icon size={20} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{stat.value}</p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <ListTodo className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Daily Rituals</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Track your progress today</p>
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/dashboard/habits')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors duration-200"
                  >
                    All Habits <ChevronRight size={14} />
                  </motion.button>
                </div>

                {viewMode === 'weekly' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modern-card">
                    <WeeklyCalendar
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      completionData={getWeeklyCompletionData()}
                    />
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {scheduledHabits.length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          className="py-20 text-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700"
                        >
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Info size={32} className="text-indigo-500 dark:text-indigo-400" />
                          </div>
                          <p className="font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest text-sm mb-2">No habits scheduled for today</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6">Start building your daily rituals</p>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/dashboard/habits/new')} 
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-xl shadow-lg shadow-indigo-500/30 transition-all"
                          >
                            Create Your First Habit
                          </motion.button>
                        </motion.div>
                      ) : (
                        scheduledHabits.map((habit, index) => (
                          <motion.div
                            key={habit.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <HabitCard
                              habit={habit}
                              completed={getHabitCompletion(habit.id)}
                              stepCompleted={getStepCompletions(habit.id)}
                              onToggle={handleToggle}
                            />
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              
              <div className="space-y-8">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <HabitStats habits={habits} logs={logs} />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <AchievementBadges />
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
