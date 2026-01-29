'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Target, Zap, Activity, Flame, Trophy } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import { motion } from 'framer-motion';

interface Stats {
  totalHabits: number;
  completedToday: number;
  weeklyCompletion: number;
  longestStreak: number;
  currentStreak: number;
  dailyData: any[];
}

export default function HabitStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 p-8 animate-pulse">
        <div className="h-6 bg-slate-100 rounded-full w-1/3 mb-10" />
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="h-24 bg-slate-50 rounded-[2rem]" />
          <div className="h-24 bg-slate-50 rounded-[2rem]" />
        </div>
        <div className="h-48 bg-slate-50 rounded-[2.5rem]" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 p-6 sm:p-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency</span>
          <h3 className="text-2xl font-black text-black tracking-tight flex items-center gap-3 mt-1">
            <Activity className="text-black" size={24} />
            BIOMETRICS
          </h3>
        </div>
        <div className="bg-black text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-black/10">
          Active Protocol
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-10">
        {[
          { label: 'Current Streak', value: stats.currentStreak, icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Success Rate', value: `${stats.weeklyCompletion.toFixed(0)}%`, icon: Trophy, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -5 }}
            className="bg-slate-50 rounded-[2rem] p-6 border-2 border-transparent hover:border-black/5 transition-all duration-500"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon className={item.color} size={16} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{item.label}</span>
            </div>
            <div className="text-3xl font-black text-black leading-none tracking-tighter">{item.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="h-56 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#000" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
              dy={10}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 900, padding: '12px 16px' }}
              cursor={{ stroke: '#000', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area 
              type="monotone" 
              dataKey="completed" 
              stroke="#000" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorPerf)" 
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-10 pt-8 border-t border-slate-50 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Longest Streak</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-black tracking-tighter">{stats.longestStreak}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase">Days</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Habits</div>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-2xl font-black text-black tracking-tighter">{stats.totalHabits}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
