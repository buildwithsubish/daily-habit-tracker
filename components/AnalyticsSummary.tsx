'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Trophy, Target, TrendingUp, Zap, Calendar } from 'lucide-react';
import { Habit, DailyLog } from '@/types';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

interface AnalyticsSummaryProps {
  habits: Habit[];
  logs: DailyLog[];
}

export default function AnalyticsSummary({ habits, logs }: AnalyticsSummaryProps) {
  // 7-day completion trend
  const trendData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStr = startOfDay(date).toISOString();
      const dayLogs = logs.filter(l => isSameDay(new Date(l.date), date) && l.completed);
      
      // Calculate completion rate based on habits active that day
      // (Simplified: using all habits for now)
      const rate = habits.length > 0 ? Math.round((dayLogs.length / habits.length) * 100) : 0;
      
      return {
        name: format(date, 'EEE'),
        rate: Math.min(rate, 100),
        fullDate: dayStr
      };
    });
  }, [habits, logs]);

  // Category distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.filter(l => l.completed).forEach(log => {
      const habit = habits.find(h => h.id === log.habitId);
      if (habit) {
        counts[habit.category] = (counts[habit.category] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [habits, logs]);

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Consistency', value: '84%', icon: Target, color: 'indigo' },
          { label: 'Current Best Streak', value: '12 Days', icon: Flame, color: 'orange' },
          { label: 'Habits Completed', value: logs.filter(l => l.completed).length, icon: Trophy, color: 'amber' },
          { label: 'Active habits', value: habits.length, icon: Zap, color: 'purple' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="p-3.5 sm:p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-500/10 flex items-center justify-center mb-3 sm:mb-4`}>
               {/* @ts-ignore */}
              <stat.icon size={18} className={`text-${stat.color}-600 dark:text-${stat.color}-400`} />
            </div>
            <p className="responsive-text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
            <p className="responsive-text-xl font-black text-slate-900 dark:text-white leading-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Weekly Performance</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Completion rate trend</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Last 7 Days</span>
            </div>
          </div>
          
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#fff',
                    padding: '8px 12px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#6366f1' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="mb-8">
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Focus Areas</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Category distribution</p>
          </div>

          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xs font-black text-slate-400 leading-none mb-1">TOTAL</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {categoryData.reduce((acc, curr) => acc + curr.value, 0)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {categoryData.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal missing component
const Flame = ({ size, className, fill }: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill={fill || "none"} 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.256 1.153-3.083C6.738 12.164 8.5 13.111 8.5 14.5Z" />
  </svg>
);
