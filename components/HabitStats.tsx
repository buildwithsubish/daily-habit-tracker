'use client';

import { useEffect, useState } from 'react';
import { Activity, Flame, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { Habit, DailyLog } from '@/types';

interface Stats {
  totalHabits: number;
  completedToday: number;
  weeklyCompletion: number;
  longestStreak: number;
  currentStreak: number;
  dailyData: any[];
}

interface HabitStatsProps {
  habits?: Habit[];
  logs?: DailyLog[];
}

export default function HabitStats({ habits = [], logs = [] }: HabitStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/analytics?days=7')
      .then(res => res.json())
      .then(data => {
        const streaks = Object.values(data.streaks || {}) as Array<{ current: number; longest: number }>;
        const longestStreak = Math.max(...streaks.map(s => s.longest), 0);
        const currentStreak = Math.max(...streaks.map(s => s.current), 0);
        const completionStats = data.completionStats || [];
        const totalDays = completionStats.length;
        const completedDays = completionStats.filter((s: any) => s.completed > 0).length;
        const averageCompletion = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

        const dailyData = completionStats.map((s: any) => ({
          name: new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }),
          completed: s.completed,
          date: s.date
        })).sort((a: any, b: any) => a.date.localeCompare(b.date));

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        setStats({
          totalHabits: data.habitStats?.length || 0,
          completedToday: completionStats.find((s: any) => s.date === todayStr)?.completed || 0,
          weeklyCompletion: averageCompletion,
          longestStreak,
          currentStreak,
          dailyData,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!mounted || loading || !stats) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="h-16 bg-slate-50 dark:bg-slate-800/30 rounded-lg" />
          <div className="h-16 bg-slate-50 dark:bg-slate-800/30 rounded-lg" />
        </div>
        <div className="h-28 bg-slate-50 dark:bg-slate-800/30 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Overview</h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Streak', value: stats.currentStreak, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
          { label: 'Consistency', value: `${stats.weeklyCompletion.toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map((item, i) => (
          <div key={i} className="rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <item.icon className={item.color} size={12} />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="h-28 w-full mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOverview" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.08}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                backgroundColor: '#fff',
                color: '#1e293b',
                boxShadow: '0 2px 8px -2px rgb(0 0 0 / 0.08)', 
                fontSize: '12px', 
                fontWeight: 500, 
                padding: '6px 10px' 
              }}
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area 
              type="monotone" 
              dataKey="completed" 
              stroke="#6366f1" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#colorOverview)" 
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Best Streak</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {stats.longestStreak} <span className="text-xs font-normal text-slate-400">days</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Active</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {stats.totalHabits} <span className="text-xs font-normal text-slate-400">habits</span>
          </p>
        </div>
      </div>
    </div>
  );
}
