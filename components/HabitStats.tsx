'use client';

import { useEffect, useState } from 'react';
import { Activity, Flame, Trophy, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
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

        setStats({
          totalHabits: data.habitStats?.length || 0,
          completedToday: completionStats.find((s: any) => s.date === new Date().toISOString().split('T')[0])?.completed || 0,
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
      <div className="modern-card animate-pulse p-6">
        <div className="h-4 bg-neutral-100 dark:bg-zinc-800 rounded-full w-1/3 mb-8" />
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="h-20 bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl" />
          <div className="h-20 bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl" />
        </div>
        <div className="h-32 bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="modern-card p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
          <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Growth</span>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Overview</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Streak', value: stats.currentStreak, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50/50 dark:bg-orange-500/10' },
          { label: 'Consistency', value: `${stats.weeklyCompletion.toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/50 dark:bg-emerald-500/10' },
        ].map((item, i) => (
          <div key={i} className="bg-neutral-50/50 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1 rounded-lg ${item.bg}`}>
                <item.icon className={item.color} size={12} />
              </div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{item.label}</span>
            </div>
            <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="h-32 w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOverview" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                backgroundColor: '#fff',
                color: '#18181b',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', 
                fontSize: '11px', 
                fontWeight: 500, 
                padding: '6px 10px' 
              }}
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area 
              type="monotone" 
              dataKey="completed" 
              stroke="#6366f1" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorOverview)" 
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Best Streak</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{stats.longestStreak}</span>
            <span className="text-[9px] font-semibold text-zinc-400 uppercase">days</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Rituals</div>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{stats.totalHabits}</span>
            <span className="text-[9px] font-semibold text-zinc-400 uppercase">active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
