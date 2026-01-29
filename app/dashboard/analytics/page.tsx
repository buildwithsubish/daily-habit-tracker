'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Flame, Calendar, Target, Zap, Award, Activity, BarChart3, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalyticsData {
  completionStats: Array<{ date: string; total: number; completed: number }>;
  habitStats: Array<{ id: string; name: string; category: string; totalLogs: number; completedLogs: number }>;
  streaks: Record<string, { current: number; longest: number; lastDate: string | null }>;
}

type Period = 'weekly' | 'monthly' | 'yearly';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full shadow-xl shadow-blue-500/20"
        />
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-400 font-black tracking-[0.3em] text-xs uppercase"
        >
          Analyzing Protocol Performance
        </motion.p>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === 'weekly') return format(date, 'EEE');
    if (period === 'monthly') return format(date, 'MMM d');
    return format(date, 'MMM');
  };

  const completionChartData = data.completionStats.map(stat => ({
    date: formatDate(stat.date),
    fullDate: stat.date,
    completionRate: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
    completed: stat.completed,
    total: stat.total,
  }));

  const habitChartData = data.habitStats
    .map(stat => ({
      name: stat.name,
      completionRate: stat.totalLogs > 0 ? (stat.completedLogs / stat.totalLogs) * 100 : 0,
      completed: stat.completedLogs,
      total: stat.totalLogs,
      category: stat.category,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  const totalCompleted = data.completionStats.reduce((sum, stat) => sum + stat.completed, 0);
  const totalPossible = data.completionStats.reduce((sum, stat) => sum + stat.total, 0);
  const overallCompletion = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
  const longestStreak = Math.max(...Object.values(data.streaks).map(s => s.longest), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 mb-20 animate-fade-in">
      {/* Header */}
      <section className="relative">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BarChart3 className="text-white" size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Performance Metrics</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none">
              Analytics <span className="text-blue-600">Engine</span>
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200"
          >
            {['weekly', 'monthly', 'yearly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as Period)}
                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  period === p ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Success Rate', value: `${overallCompletion.toFixed(1)}%`, icon: TrendingUp, color: 'from-blue-600 to-blue-400', delay: 0 },
            { label: 'Total Completions', value: totalCompleted, icon: Target, color: 'from-emerald-600 to-emerald-400', delay: 0.1 },
            { label: 'Best Streak', value: longestStreak, icon: Flame, color: 'from-orange-600 to-orange-400', delay: 0.2 },
            { label: 'Active Protocol', value: data.habitStats.length, icon: Zap, color: 'from-indigo-600 to-indigo-400', delay: 0.3 },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-black/5`}>
                <stat.icon size={24} />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-8 sm:p-12 text-white overflow-hidden relative shadow-2xl border border-slate-800"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-[2px]" />
          
          <div className="flex justify-between items-start mb-12 relative z-10">
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Activity Flow</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Real-time completion mapping</p>
            </div>
            <Activity className="text-blue-500 animate-pulse" size={24} />
          </div>

          <div className="h-[400px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={completionChartData}>
                <defs>
                  <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }}
                  dy={10}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completionRate" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorFlow)"
                  animationDuration={2500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm"
          >
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-8">Top Protocols</h3>
            <div className="space-y-6">
              {habitChartData.slice(0, 5).map((habit, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">{habit.name}</span>
                    <span className="text-blue-600">{habit.completionRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${habit.completionRate}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-500/20"
          >
            <Award className="mb-6" size={32} />
            <h3 className="text-xl font-black tracking-tight uppercase mb-2">Weekly Goal</h3>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest leading-relaxed">
              You are currently at {overallCompletion.toFixed(1)}% efficiency. Aim for 80% to maintain peak performance.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Habit Breakdown */}
      <section className="bg-white rounded-[3rem] p-8 sm:p-12 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Zap className="text-white" size={20} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Habit Breakdown</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(data.streaks).map(([habitId, streak], index) => {
            const habit = data.habitStats.find(h => h.id === habitId);
            if (!habit) return null;
            return (
              <motion.div 
                key={habitId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-500/10 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{habit.category}</span>
                  <Flame size={18} className={streak.current > 0 ? 'text-orange-500' : 'text-slate-300'} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-6 truncate">{habit.name}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Streak</div>
                    <div className="text-2xl font-black text-slate-900">{streak.current}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Success</div>
                    <div className="text-xl font-black text-blue-600">
                      {habit.totalLogs > 0 ? ((habit.completedLogs / habit.totalLogs) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{payload[0].payload.date}</p>
        <p className="text-xl font-black text-white tracking-tighter">{payload[0].value.toFixed(1)}%</p>
        <p className="text-[10px] font-bold text-blue-400 uppercase mt-2">
          {payload[0].payload.completed} / {payload[0].payload.total} Habits
        </p>
      </div>
    );
  }
  return null;
}
