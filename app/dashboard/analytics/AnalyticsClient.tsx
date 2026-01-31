'use client';

import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Target, Flame, Brain, Heart, Sparkles, TrendingUp, Award } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { AnalyticsSkeleton } from '@/components/Skeleton';

const colorClasses = {
  orange: {
    icon: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/20',
    gradient: 'from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10',
  },
  indigo: {
    icon: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/20',
    gradient: 'from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10',
  },
  purple: {
    icon: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/20',
    gradient: 'from-purple-50 to-fuchsia-50 dark:from-purple-500/10 dark:to-fuchsia-500/10',
  },
  emerald: {
    icon: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10',
  },
  rose: {
    icon: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
    gradient: 'from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10',
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// Mock data for fallback
const defaultWeeklyData = [
  { name: 'Mon', completion: 65, consistency: 40 },
  { name: 'Tue', completion: 85, consistency: 60 },
  { name: 'Wed', completion: 75, consistency: 55 },
  { name: 'Thu', completion: 90, consistency: 80 },
  { name: 'Fri', completion: 95, consistency: 85 },
  { name: 'Sat', completion: 70, consistency: 90 },
  { name: 'Sun', completion: 80, consistency: 75 },
];

const defaultCategoryData = [
  { name: 'Health', value: 35, color: '#10b981' },
  { name: 'Mindset', value: 25, color: '#6366f1' },
  { name: 'Growth', value: 28, color: '#f59e0b' },
  { name: 'Focus', value: 12, color: '#8b5cf6' },
];

export default function AnalyticsClient() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchAnalytics();
    }
  }, [mounted, activeTab]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const days = activeTab === 'week' ? 7 : 30;
      const res = await fetch(`/api/analytics?days=${days}`);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform API data for charts
  const getWeeklyData = () => {
    if (!analyticsData?.completionStats) return defaultWeeklyData;
    
    const completionStats = analyticsData.completionStats;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return completionStats.slice(-7).map((stat: any, index: number) => {
      const date = new Date(stat.date);
      return {
        name: dayNames[date.getDay()],
        completion: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
        consistency: Math.round(50 + Math.random() * 40), // Fallback consistency
      };
    });
  };

  const getCategoryData = () => {
    if (!analyticsData?.habitStats) return defaultCategoryData;
    
    const categories: Record<string, number> = {};
    analyticsData.habitStats.forEach((habit: any) => {
      const cat = habit.category || 'Other';
      categories[cat] = (categories[cat] || 0) + habit.completedLogs;
    });
    
    const total = Object.values(categories).reduce((a: number, b: number) => a + b, 0) || 1;
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value: Math.round((value / total) * 100),
      color: colors[index % colors.length],
    }));
  };

  const getStreaks = () => {
    if (!analyticsData?.streaks) return { current: 14, longest: 21 };
    
    const streaks = Object.values(analyticsData.streaks) as Array<{ current: number; longest: number }>;
    const current = Math.max(...streaks.map(s => s.current), 0);
    const longest = Math.max(...streaks.map(s => s.longest), 0);
    return { current, longest: Math.max(current, longest) };
  };

  const getCompletionRate = () => {
    if (!analyticsData?.completionStats) return 82;
    
    const stats = analyticsData.completionStats;
    const total = stats.reduce((acc: number, s: any) => acc + s.total, 0);
    const completed = stats.reduce((acc: number, s: any) => acc + s.completed, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 82;
  };

  const weeklyData = getWeeklyData();
  const categoryData = getCategoryData();
  const streaks = getStreaks();
  const completionRate = getCompletionRate();

  if (!mounted) return <AnalyticsSkeleton />;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20 pb-20"
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full mb-4 shadow-sm">
              <TrendingUp size={14} />
              <span>Insights & Analytics</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                Your Journey
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-lg max-w-xl">
              Track your progress, celebrate wins, and discover patterns in your daily habits.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <div className="flex bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-zinc-950/40">
              {['week', 'month'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'week' | 'month')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[
            { icon: Flame, label: 'Current Streak', value: streaks.current, suffix: 'days', colorKey: 'orange', gradient: 'orange' },
            { icon: Target, label: 'Completion Rate', value: completionRate, suffix: '%', colorKey: 'indigo', gradient: 'indigo' },
            { icon: Brain, label: 'Focus Score', value: 78, suffix: '%', colorKey: 'purple', gradient: 'purple' },
            { icon: Award, label: 'Best Streak', value: streaks.longest, suffix: 'days', colorKey: 'emerald', gradient: 'emerald' },
          ].map((stat, index) => {
            const colors = colorClasses[stat.colorKey as keyof typeof colorClasses];
            return (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${colors.gradient} border ${colors.border} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                
                <div className={`relative z-10`}>
                  <div className={`w-14 h-14 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm ${colors.bg} flex items-center justify-center mb-5 shadow-sm`}>
                    <stat.icon size={26} className={colors.icon} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                      {loading ? '—' : stat.value}
                    </span>
                    <span className="text-sm font-medium text-zinc-400">{stat.suffix}</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-2">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Main Charts Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-zinc-950/40 p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Consistency Trend</h3>
                <p className="text-sm text-zinc-500 mt-1">Your daily activity over the past {activeTab === 'week' ? 'week' : 'month'}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/40" />
                  <span className="text-sm font-medium text-zinc-500">Completion</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/40" />
                  <span className="text-sm font-medium text-zinc-500">Consistency</span>
                </div>
              </div>
            </div>
            
            <div className="h-[320px] w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-400 font-medium">Loading data...</span>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorCompletionNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConsistencyNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 13, fontWeight: 600, fill: '#94a3b8' }}
                      dy={15}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(226,232,240,0.8)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
                      }}
                      labelStyle={{ color: '#18181b', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}
                      itemStyle={{ fontWeight: 600, fontSize: '12px', padding: '4px 0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completion" 
                      stroke="url(#colorCompletionNew)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorCompletionNew)"
                      filter="url(#glow)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="consistency" 
                      stroke="url(#colorConsistencyNew)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorConsistencyNew)"
                      filter="url(#glow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* AI Insights & Category */}
          <div className="space-y-6 lg:space-y-8">
            {/* AI Insights Card */}
            <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 shadow-xl shadow-indigo-500/25">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Smart Insights</h3>
                </div>
                <p className="text-white/90 leading-relaxed text-sm font-medium">
                  "You're most consistent on <span className="text-yellow-300">weekdays</span>. Your morning routine has a <span className="text-yellow-300">94% success rate</span> when started before 8:00 AM."
                </p>
                <div className="mt-6 pt-5 border-t border-white/20">
                  <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wider">Suggestion:</p>
                  <p className="text-sm mt-2 text-white/80 italic">Try shifting your reading habit to 7:45 AM for better consistency.</p>
                </div>
              </div>
            </motion.div>

            {/* Focus Areas Pie Chart */}
            <motion.div variants={itemVariants} className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-zinc-950/40 p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Focus Areas</h3>
              
              <div className="h-[180px] w-full relative">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke="none"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                    {loading ? '—' : '82%'}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Total</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{cat.name}</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white ml-auto">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Habit Stats */}
      <motion.div variants={itemVariants} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900 p-6 lg:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white">Habit Performance</h3>
              <p className="text-zinc-400 mt-1">Detailed breakdown of your daily habits</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="text-sm font-semibold text-white">Total Habits:</span>
                <span className="ml-2 text-lg font-bold text-emerald-400">{analyticsData?.habitStats?.length || 0}</span>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
                  <div className="h-5 bg-white/10 rounded-lg w-2/3 mb-3" />
                  <div className="h-8 bg-white/10 rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsData?.habitStats?.slice(0, 6).map((habit: any, index: number) => {
                const completionRate = habit.totalLogs > 0 
                  ? Math.round((habit.completedLogs / habit.totalLogs) * 100) 
                  : 0;
                const statusColor = completionRate >= 80 ? 'emerald' : completionRate >= 50 ? 'yellow' : 'rose';
                
                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{habit.name}</h4>
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">{habit.category}</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        statusColor === 'emerald' ? 'bg-emerald-400' : 
                        statusColor === 'yellow' ? 'bg-yellow-400' : 'bg-rose-400'
                      }`} />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">{completionRate}%</span>
                        <span className="text-xs text-zinc-500">completion</span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {habit.completedLogs}/{habit.totalLogs} logs
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          statusColor === 'emerald' ? 'bg-emerald-400' : 
                          statusColor === 'yellow' ? 'bg-yellow-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer spacing */}
      <div className="h-12" />
    </motion.div>
  );
}

