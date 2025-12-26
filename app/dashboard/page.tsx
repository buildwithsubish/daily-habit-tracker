'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Habit, DailyLog } from '@/types';
import HabitCard from '@/components/HabitCard';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import AchievementBadges from '@/components/AchievementBadges';
import HabitStats from '@/components/HabitStats';
import { getToday } from '@/lib/utils';
import { Calendar, TrendingUp, Circle } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

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
      const res = await fetch(`/api/logs?date=${selectedDate}`);
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
      (habit.type === 'single-step' ? (log.stepIndex === null || log.stepIndex === undefined) : log.stepIndex === stepIndex)
    );

    const completed = !existingLog?.completed;

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          date: selectedDate,
          stepIndex: stepIndex ?? null,
          completed,
        }),
      });

      fetchLogs();
    } catch (error) {
      console.error('Failed to update log:', error);
    }
  };

  const getHabitCompletion = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit?.type === 'single-step') {
      const log = logs.find(l => l.habitId === habitId && (l.stepIndex === null || l.stepIndex === undefined));
      return log?.completed || false;
    }
    return false;
  };

  const getStepCompletions = (habitId: string) => {
    return logs
      .filter(l => l.habitId === habitId && l.completed && l.stepIndex !== null && l.stepIndex !== undefined)
      .map(l => l.stepIndex as number);
  };

  const completionRate = habits.length > 0
    ? (logs.filter(l => l.completed).length / habits.length) * 100
    : 0;

  // Get weekly completion data for calendar
  const getWeeklyCompletionData = () => {
    const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const completionData: Record<string, number> = {};
    
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (dateStr === selectedDate) {
        completionData[dateStr] = logs.filter(l => l.completed).length;
      } else {
        completionData[dateStr] = 0;
      }
    });
    
    return completionData;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 animate-fade-in-up">
      {/* Header */}
      <div className="mb-5 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1.5 sm:mb-2 animate-slide-in-right leading-tight">
              Daily Habits
            </h1>
            <p className="text-sm sm:text-base text-gray-600 animate-fade-in-up">Track your progress and build consistency</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 ${
                viewMode === 'daily'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 ${
                viewMode === 'weekly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Calendar */}
      {viewMode === 'weekly' && (
        <div className="mb-4 sm:mb-6">
          <WeeklyCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            completionData={getWeeklyCompletionData()}
          />
        </div>
      )}

      {/* Main Content - Checklist First Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {/* Checklist - First Priority (Left, takes 2/3 width) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-300 animate-scale-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-5 md:mb-6 gap-3">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-primary-500 flex-shrink-0" />
                <span className="truncate">{viewMode === 'daily' ? "Today's Checklist" : "Habits Checklist"}</span>
              </h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-300 hover:border-primary-300 font-medium"
                />
              </div>
            </div>

            {habits.length === 0 ? (
              <div className="text-center py-12 sm:py-16 md:py-20">
                <div className="mb-5 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full">
                    <Circle className="text-primary-400" size={40} strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">No habits yet</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto px-4">Start your journey by creating your first habit or choose from our ready-made presets</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                  <button
                    onClick={() => router.push('/dashboard/habits')}
                    className="bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl hover-lift ripple"
                  >
                    Create Your First Habit
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/habits')}
                    className="bg-white text-primary-600 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl border-2 border-primary-200 hover:border-primary-300 transition-all font-semibold text-sm sm:text-base shadow-sm hover:shadow-md"
                  >
                    Browse Presets
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {habits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    completed={getHabitCompletion(habit.id)}
                    stepCompleted={getStepCompletions(habit.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Progress Card */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-300 animate-scale-in">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-primary-600 animate-pulse-glow" size={18} />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Today's Progress</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-700 font-semibold">Completion Rate</span>
                <span className="text-lg sm:text-xl font-bold text-primary-600">
                  {completionRate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 h-2.5 sm:h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${completionRate}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 text-center font-semibold">
                {logs.filter(l => l.completed).length} of {habits.length} completed
              </p>
            </div>
          </div>
        </div>

        {/* Stats and Achievements Sidebar (Right, takes 1/3 width) */}
        <div className="space-y-4 sm:space-y-5">
          <HabitStats />
          <AchievementBadges />
        </div>
      </div>
    </div>
  );
}
