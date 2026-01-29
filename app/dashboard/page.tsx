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
import { Calendar, ListTodo, Sparkles, Edit, ChevronRight, Zap } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [celebration, setCelebration] = useState<{ isOpen: boolean; type: '7-day' | '30-day' | 'daily' }>({
    isOpen: false,
    type: '7-day',
  });

  useEffect(() => {
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

    // Check completion for the specific step or habit on the selected date
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
        // Only check for celebration on today's completions
        if (selectedDate === getToday()) {
          const result = await res.json();
          const newStreak = result.streak;
          
          if (newStreak === 7) setCelebration({ isOpen: true, type: '7-day' });
          else if (newStreak === 30) setCelebration({ isOpen: true, type: '30-day' });
          else {
            // Check if all habits for today are now completed
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
      // Also refresh habits to get updated streaks
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-black rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Protocol</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6 sm:space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 mb-20 lg:mb-0">
      <StreakCelebration 
        isOpen={celebration.isOpen} 
        onClose={() => setCelebration({ ...celebration, isOpen: false })} 
        type={celebration.type} 
      />

      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <Sparkles size={14} className="text-blue-500" />
            <span>Ready to crush your goals!</span>
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
            My Dashboard
          </h1>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit shadow-inner border border-slate-200">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              viewMode === 'daily' ? 'bg-white text-blue-600 shadow-lg shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              viewMode === 'weekly' ? 'bg-white text-blue-600 shadow-lg shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            This Week
          </button>
        </div>
      </section>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Protocol</div>
                  <div className="text-lg font-black text-slate-900 uppercase">
                    {new Date(selectedDate).getUTCDay() === 0 || new Date(selectedDate).getUTCDay() === 6 ? 'Weekend Routine' : 'Weekday Routine'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => router.push('/dashboard/habits')}
                className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all"
              >
                <Edit size={18} />
              </button>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Zap size={24} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Target</div>
                  <div className="text-lg font-black text-slate-900 uppercase">
                    {scheduledHabits.find(h => !getHabitCompletion(h.id))?.name || 'Protocol Clear'}
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center">
                <ChevronRight size={18} className="text-slate-300" />
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
              className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden group shadow-2xl shadow-blue-900/10 border border-slate-800"
            >
              {/* Decorative scan line animation */}
              <motion.div
                animate={{ y: [0, 200, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/20 blur-sm pointer-events-none"
              />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                    <Calendar size={14} className="text-blue-400" />
                    {format(new Date(selectedDate), 'MMMM dd, yyyy')}
                  </div>
                  <div>
                    <div className="text-6xl sm:text-7xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{completionRate.toFixed(0)}%</div>
                    <div className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Daily Progress</div>
                  </div>
                </div>
                <div className="flex gap-4 sm:gap-6">
                  <div className="flex-1 sm:flex-none bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/5 flex flex-col items-center min-w-[120px] group-hover:bg-blue-600/10 transition-colors">
                    <span className="text-3xl font-black mb-1">{completedHabitsCount}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Done</span>
                  </div>
                  <div className="flex-1 sm:flex-none bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/5 flex flex-col items-center min-w-[120px]">
                    <span className="text-3xl font-black mb-1">{scheduledHabits.length}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Goal</span>
                  </div>
                </div>
              </div>
              {/* Progress Bar Background */}
              <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                />
              </div>
            </motion.div>
          )}
        </div>
        <div className="animate-scale-in">
          <HabitStats />
        </div>
      </div>

      {/* Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ListTodo className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Today's Habits</h2>
            </div>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto bg-slate-100 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              />
            </div>
          </div>

          {scheduledHabits.length === 0 ? (
            <div className="bg-slate-50 rounded-[2.5rem] p-16 text-center space-y-6 border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                <Sparkles className="text-blue-400" size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">You're All Done!</h3>
                <p className="text-slate-500 font-bold mt-2">No habits scheduled for today. Take some time to relax!</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/habits')}
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                Manage My Habits
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {scheduledHabits.map((habit, i) => (
                  <motion.div 
                    layout
                    key={habit.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <HabitCard
                      habit={habit}
                      completed={getHabitCompletion(habit.id)}
                      stepCompleted={getStepCompletions(habit.id)}
                      onToggle={handleToggle}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Sidebar Achievements */}
        <aside className="space-y-8">
          <div className="lg:sticky lg:top-32">
            <AchievementBadges />
          </div>
        </aside>
      </div>
    </div>
  );
}
