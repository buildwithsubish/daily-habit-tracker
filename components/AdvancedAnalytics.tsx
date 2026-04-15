'use client';

import React, { useMemo } from 'react';
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
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

interface AdvancedAnalyticsProps {
  habits: Habit[];
  logs: DailyLog[];
}

export default function AdvancedAnalytics({ habits, logs }: AdvancedAnalyticsProps) {
  // 1. Workout frequency (monthly)
  const workoutTrend = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const date = subDays(new Date(), 29 - i);
      const workoutLogs = logs.filter(l => 
        isSameDay(new Date(l.date), date) && 
        l.completed && 
        l.workoutData
      );
      
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
  }, [logs]);

  // 2. Measurable habits completion value trend
  const measurableHabits = habits.filter(h => h.type === 'measurable');
  
  const measurableTrend = useMemo(() => {
    if (measurableHabits.length === 0) return [];
    
    // Pick the most logged measurable habit
    const topHabit = measurableHabits[0];
    
    return Array.from({ length: 14 }).map((_, i) => {
      const date = subDays(new Date(), 13 - i);
      const log = logs.find(l => l.habitId === topHabit.id && isSameDay(new Date(l.date), date));
      
      return {
        name: format(date, 'EEE'),
        value: log?.value || 0,
        target: topHabit.targetValue || 0
      };
    });
  }, [measurableHabits, logs]);

  // 3. Deep Stats Calculations (Removed fake values)
  const deepStats = useMemo(() => {
    // Avg Time/Habit calculation
    let totalMinutes = 0;
    let entriesWithDuration = 0;
    
    logs.forEach(log => {
      if (log.completed) {
        if (log.workoutData?.totalDuration) {
          totalMinutes += log.workoutData.totalDuration;
          entriesWithDuration++;
        } else if (log.subActivities && log.subActivities.length > 0) {
          totalMinutes += log.subActivities.length * 10; 
          entriesWithDuration++;
        }
      }
    });

    const avgTime = entriesWithDuration > 0 ? Math.round(totalMinutes / entriesWithDuration) : 0;

    // Weekly Velocity calculation
    const now = new Date();
    const thisWeekStart = subDays(startOfDay(now), 7);
    const lastWeekStart = subDays(thisWeekStart, 7);

    const thisWeekLogs = logs.filter(l => new Date(l.date) >= thisWeekStart);
    const lastWeekLogs = logs.filter(l => new Date(l.date) >= lastWeekStart && new Date(l.date) < thisWeekStart);

    const thisWeekRate = thisWeekLogs.length > 0 ? (thisWeekLogs.filter(l => l.completed).length / thisWeekLogs.length) : 0;
    const lastWeekRate = lastWeekLogs.length > 0 ? (lastWeekLogs.filter(l => l.completed).length / lastWeekLogs.length) : 0;

    const velocity = lastWeekRate > 0 
      ? Math.round(((thisWeekRate - lastWeekRate) / lastWeekRate) * 100)
      : thisWeekRate > 0 ? 100 : 0;

    // Completion IQ calculation
    const overallRate = logs.length > 0 ? (logs.filter(l => l.completed).length / logs.length) : 0;
    const activeHabits = habits.length;
    const streakFactor = habits.reduce((acc, h) => acc + (h.streak || 0), 0) / (activeHabits || 1);
    const iq = Math.min(100, Math.round((overallRate * 70) + (streakFactor * 3)));

    return [
      { label: 'Avg Time/Habit', value: avgTime > 0 ? `${avgTime}min` : 'N/A', icon: Timer, color: 'blue' },
      { label: 'Weekly Velocity', value: `${velocity >= 0 ? '+' : ''}${velocity}%`, icon: Zap, color: 'orange' },
      { label: 'Completion IQ', value: iq > 0 ? iq.toString() : '0', icon: Activity, color: 'emerald' },
    ];
  }, [habits, logs]);

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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Monthly Volume</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Total Sets Completed</h4>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workoutTrend.slice(-14)}>
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
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Calorie Burn</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Daily Energy Expenditure</h4>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={workoutTrend.slice(-14)}>
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

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          </div>
        </section>
      )}

      {/* Deep Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {deepStats.map((item, i) => (
          <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-${item.color}-100 dark:border-${item.color}-900/50 flex items-center justify-center`}>
              {/* @ts-ignore */}
              <item.icon size={20} className={`text-${item.color}-600 dark:text-${item.color}-400`} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white leading-tight">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
