'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { Dumbbell, Activity, Timer, Zap } from 'lucide-react';
import { Habit, DailyLog } from '@/types';
import { format, addDays, differenceInCalendarDays } from 'date-fns';

interface AdvancedAnalyticsProps {
  habits: Habit[];
  logs: DailyLog[];
  startDate: string;
  endDate: string;
}

export default function AdvancedAnalytics({ habits, logs, startDate, endDate }: AdvancedAnalyticsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // All detailed charts use the selected report interval.
  const workoutTrend = useMemo(() => {
    const days = Math.max(1, differenceInCalendarDays(new Date(`${endDate}T12:00:00`), new Date(`${startDate}T12:00:00`)) + 1);
    return Array.from({ length: days }).map((_, i) => {
      const date = addDays(new Date(`${startDate}T12:00:00`), i);
      const key = format(date, 'yyyy-MM-dd');
      const workoutLogs = logs.filter(l => l.date === key && l.completed && l.workoutData);
      
      const volume = workoutLogs.reduce((acc, l) => {
        const exs = l.workoutData?.exercises || [];
        return acc + exs.reduce((exAcc, ex) => exAcc + ex.sets.length, 0);
      }, 0);

      return {
        name: format(date, 'MMM d'),
        volume: volume,
        calories: workoutLogs.reduce((acc, l) => acc + (l.workoutData?.caloriesBurned || 0), 0)
      };
    });
  }, [logs, startDate, endDate]);

  // 2. Measurable habits completion value trend
  const measurableHabits = habits.filter(h => h.type === 'measurable');
  
  const measurableTrend = useMemo(() => {
    if (measurableHabits.length === 0) return [];
    
    // Pick the most logged measurable habit
    const topHabit = measurableHabits[0];
    
    const days = Math.max(1, differenceInCalendarDays(new Date(`${endDate}T12:00:00`), new Date(`${startDate}T12:00:00`)) + 1);
    return Array.from({ length: days }).map((_, i) => {
      const date = addDays(new Date(`${startDate}T12:00:00`), i);
      const log = logs.find(l => l.habitId === topHabit.id && l.date === format(date, 'yyyy-MM-dd') && l.completed);
      
      return {
        name: format(date, days > 10 ? 'd' : 'EEE'),
        value: log?.value || 0,
        target: topHabit.targetValue || 0
      };
    });
  }, [measurableHabits, logs, startDate, endDate]);

  // 3. Deep Stats Calculations (Removed fake values)
  const deepStats = useMemo(() => {
    const sessions = logs.filter(log => log.completed && log.workoutData);
    const minutes = sessions.reduce((sum, log) => sum + (log.workoutData?.totalDuration || 0), 0);
    const sets = sessions.reduce((sum, log) => sum + (log.workoutData?.exercises || []).reduce((count, exercise) => count + exercise.sets.filter(set => set.completed).length, 0), 0);
    return [
      { label: 'Workout sessions', value: `${sessions.length}`, icon: Dumbbell, color: 'blue' },
      { label: 'Completed sets', value: `${sets}`, icon: Zap, color: 'orange' },
      { label: 'Logged workout time', value: minutes ? `${minutes} min` : '—', icon: Timer, color: 'emerald' },
    ];
  }, [logs]);

  return (
    <div className="space-y-8 pb-32">
      {/* Workout Insights */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell size={20} className="text-indigo-600" />
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Fitness Intelligence</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Selected period</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Total Sets Completed</h4>
            </div>
            <div className="h-[200px] w-full min-h-[200px]">
              {!mounted ? (
                <div className="h-full w-full bg-slate-50 dark:bg-slate-800/30 rounded-lg animate-pulse" />
              ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 200 }}>
                <BarChart data={workoutTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">User-entered workout data</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Logged calories</h4>
            </div>
            <div className="h-[200px] w-full min-h-[200px]">
              {!mounted ? (
                <div className="h-full w-full bg-slate-50 dark:bg-slate-800/30 rounded-lg animate-pulse" />
              ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 200 }}>
                <LineChart data={workoutTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="calories" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Measurable Progress */}
      {measurableHabits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-emerald-600" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Measurable Metrics</h3>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{measurableHabits[0].name}</p>
                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Target vs Actual</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Target</span>
                </div>
              </div>
            </div>

            <div className="h-[240px] w-full min-h-[240px]">
              {!mounted ? (
                <div className="h-full w-full bg-slate-50 dark:bg-slate-800/30 rounded-lg animate-pulse" />
              ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 200 }}>
                <BarChart data={measurableTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="target" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={40} />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} style={{ transform: 'translateX(-40px)' }} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Deep Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {deepStats.map((item, i) => (
          <div key={i} className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-${item.color}-100 dark:border-${item.color}-900/50 flex items-center justify-center shrink-0`}>
              {/* @ts-ignore */}
              <item.icon size={18} className={`text-${item.color}-600 dark:text-${item.color}-400`} />
            </div>
            <div>
              <p className="responsive-text-xs font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="responsive-text-xl font-black text-slate-900 dark:text-white leading-tight">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
