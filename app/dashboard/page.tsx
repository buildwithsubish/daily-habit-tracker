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
import { Calendar, ListTodo, Sparkles, Edit, ChevronRight, Zap, Target, ArrowRight, Activity, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [hasMounted, setHasMounted] = useState(false);
  const [celebration, setCelebration] = useState<{ isOpen: boolean; type: '7-day' | '30-day' | 'daily' }>({
    isOpen: false,
    type: '7-day',
  });

  useEffect(() => {
    setHasMounted(true);
    fetchHabits();
    fetchLogs();
  }, [selectedDate]);

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
    } finally {
      setLoading(false);
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

  const getWeeklyCompletionData = () => {
    const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const completionData: Record<string, { completed: number; total: number }> = {};
    
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const scheduledForDay = habits.filter(h => isHabitScheduled(h, dateStr));
      const completedForDay = scheduledForDay.filter(h => getHabitCompletion(h.id, dateStr)).length;
      completionData[dateStr] = {
        completed: completedForDay,
        total: scheduledForDay.length
      };
    });
    
    return completionData;
  };

  if (!hasMounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
             <Activity className="text-blue-600" size={20} />
          </div>
        </motion.div>
        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-24">
        <StreakCelebration 
          isOpen={celebration.isOpen} 
          onClose={() => setCelebration({ ...celebration, isOpen: false })} 
          type={celebration.type} 
        />

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Dashboard</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            </h1>
          </div>
          
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                viewMode === 'daily' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                viewMode === 'weekly' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Weekly
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{format(new Date(selectedDate), 'EEE, MMM d')}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Today</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Target size={20} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{completionRate.toFixed(0)}%</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Completion</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{completedHabitsCount}/{scheduledHabits.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Completed</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {scheduledHabits.find(h => !getHabitCompletion(h.id))?.name?.slice(0, 10) || 'All Done'}
            </p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Next Task</p>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Habits Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center">
                  <ListTodo className="text-white dark:text-slate-900" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Today's Habits</h2>
              </div>
              <button 
                onClick={() => router.push('/dashboard/habits')}
                className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider hover:text-blue-500 transition-colors"
              >
                Manage
                <ChevronRight size={14} />
              </button>
            </div>

            {viewMode === 'weekly' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6"
              >
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800"
                    >
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-slate-300 dark:text-slate-700" />
                      </div>
                      <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No habits scheduled</p>
                      <button 
                        onClick={() => router.push('/dashboard/habits')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        Add Habits
                      </button>
                    </motion.div>
                  ) : (
                    scheduledHabits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        completed={getHabitCompletion(habit.id)}
                        stepCompleted={getStepCompletions(habit.id)}
                        onToggle={handleToggle}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <HabitStats />
            <AchievementBadges />
          </div>
        </div>
      </div>
    </div>
  );
}

