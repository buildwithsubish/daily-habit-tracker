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
import { Calendar, ListTodo, Sparkles, Edit, ChevronRight, Zap, Target, ArrowRight, Activity, TrendingUp } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 border-t-2 border-blue-600 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <Activity className="text-blue-600 animate-pulse" size={24} />
          </div>
        </div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Synchronizing Systems</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 space-y-16">
        <StreakCelebration 
          isOpen={celebration.isOpen} 
          onClose={() => setCelebration({ ...celebration, isOpen: false })} 
          type={celebration.type} 
        />

        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full"
            >
              <Sparkles size={12} />
              Performance Interface
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
              Operational <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Overview.</span>
            </h1>
          </div>
          
          <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                viewMode === 'daily' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                viewMode === 'weekly' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Weekly
            </button>
          </div>
        </section>

        {/* Core Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                whileHover={{ y: -8 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Calendar size={28} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Current Protocol</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white uppercase">
                      {format(new Date(selectedDate), 'EEEE')}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => router.push('/dashboard/habits')}
                  className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"
                >
                  <Edit size={20} />
                </button>
              </motion.div>

              <motion.div 
                whileHover={{ y: -8 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <Target size={28} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Next Objective</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white uppercase truncate max-w-[150px]">
                      {scheduledHabits.find(h => !getHabitCompletion(h.id))?.name || 'Clear'}
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                  <ArrowRight size={20} className="text-slate-300 dark:text-slate-700" />
                </div>
              </motion.div>
            </div>

            {viewMode === 'weekly' ? (
              <div className="animate-scale-in">
                <WeeklyCalendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  completionData={getWeeklyCompletionData()}
                />
              </div>
            ) : (
              <motion.div 
                layout
                className="bg-slate-900 dark:bg-black rounded-[3.5rem] p-12 sm:p-16 text-white relative overflow-hidden group shadow-2xl border border-slate-800"
              >
                <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-opacity">
                   <TrendingUp size={240} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                  <div className="space-y-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                      <Calendar size={14} className="text-blue-400" />
                      {format(new Date(selectedDate), 'MMMM dd, yyyy')}
                    </div>
                    <div>
                      <div className="text-8xl font-black mb-2 tracking-tighter text-white">
                        {completionRate.toFixed(0)}<span className="text-blue-500 text-4xl">%</span>
                      </div>
                      <div className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Efficiency Rating</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center min-w-[140px] hover:bg-blue-600/10 transition-colors">
                      <span className="text-4xl font-black mb-1">{completedHabitsCount}</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Done</span>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center min-w-[140px]">
                      <span className="text-4xl font-black mb-1">{scheduledHabits.length}</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</span>
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-3 bg-slate-800/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="animate-scale-in">
            <HabitStats />
          </div>
        </div>

        {/* Task List */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-900 dark:bg-white rounded-3xl flex items-center justify-center shadow-xl">
                  <ListTodo className="text-white dark:text-slate-900" size={28} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Active Modules</h2>
              </div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {completedHabitsCount}/{scheduledHabits.length} Completed
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {scheduledHabits.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800"
                  >
                    <div className="text-slate-300 dark:text-slate-700 mb-4">
                       <Zap size={48} className="mx-auto" />
                    </div>
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No tasks scheduled for this period</p>
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
          </div>
          
          <div className="space-y-10">
             <AchievementBadges />
          </div>
        </section>
      </div>
    </div>
  );
}
