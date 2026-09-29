'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Target, Flame, Sparkles, TrendingUp, Award } from 'lucide-react';
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

export default function AnalyticsClient() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'year'>('week');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setFetchError(false);
      setAnalyticsData(null);
      const period = activeTab === 'week' ? 'weekly' : activeTab === 'month' ? 'monthly' : 'yearly';
      try {
        const response = await fetch(`/api/analytics?period=${period}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load analytics');
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setFetchError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [mounted, activeTab, reloadCount]);

  // Transform API data for charts
  const getWeeklyData = () => {
    if (!analyticsData?.completionStats) return [];

    const completionStats = analyticsData.completionStats;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (activeTab === 'year') {
      // Bucket last ~365 days into months for readability
      const slice = completionStats.slice(-365);
      const monthMap = new Map<string, { completed: number; total: number }>();
      slice.forEach((stat: any) => {
        const d = new Date(`${stat.date}T12:00:00`);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const prev = monthMap.get(key) || { completed: 0, total: 0 };
        monthMap.set(key, { completed: prev.completed + stat.completed, total: prev.total + stat.total });
      });

      return Array.from(monthMap.entries()).map(([key, agg]) => {
        const [y, m] = key.split('-');
        return {
          name: `${m}/${y.slice(2)}`,
          completion: agg.total > 0 ? Math.round((agg.completed / agg.total) * 100) : 0,
        };
      });
    }

    const slice = completionStats.slice(activeTab === 'week' ? -7 : -30);
    return slice.map((stat: any) => {
      const date = new Date(stat.date);
      return {
        name: activeTab === 'week' ? dayNames[date.getDay()] : `${date.getMonth() + 1}/${date.getDate()}`,
        completion: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
      };
    });
  };

  const getCategoryData = () => {
    if (!analyticsData?.habitStats) return [];

    const categories: Record<string, number> = {};
    analyticsData.habitStats.forEach((habit: any) => {
      const cat = habit.category || 'Other';
      categories[cat] = (categories[cat] || 0) + habit.completedLogs;
    });

    const total = Object.values(categories).reduce((a: number, b: number) => a + b, 0);
    if (!total) return [];
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value: Math.round((value / total) * 100),
      color: colors[index % colors.length],
    }));
  };

  const getStreaks = () => {
    if (!analyticsData?.streaks) return { current: 0, longest: 0 };

    const streaks = Object.values(analyticsData.streaks) as Array<{ current: number; longest: number }>;
    const current = Math.max(...streaks.map(s => s.current), 0);
    const longest = Math.max(...streaks.map(s => s.longest), 0);
    return { current, longest: Math.max(current, longest) };
  };

  const getCompletionRate = () => {
    if (!analyticsData?.completionStats) return 0;

    const stats = analyticsData.completionStats;
    const total = stats.reduce((acc: number, s: any) => acc + s.total, 0);
    const completed = stats.reduce((acc: number, s: any) => acc + s.completed, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const weeklyData = getWeeklyData();
  const categoryData = getCategoryData();
  const streaks = getStreaks();
  const completionRate = getCompletionRate();

  const getConsistencyRate = () => {
    const stats = analyticsData?.completionStats as Array<{ completed: number }> | undefined;
    if (!stats || stats.length === 0) return 0;
    const window = activeTab === 'week' ? 7 : activeTab === 'month' ? 30 : 365;
    const slice = stats.slice(-window);
    const daysWithAny = slice.reduce((acc, s: any) => acc + (s.completed > 0 ? 1 : 0), 0);
    return Math.round((daysWithAny / window) * 100);
  };

  const completionStats = (analyticsData?.completionStats || []) as Array<{ date: string; total: number; completed: number }>;
  const weekdayTotals = new Map<string, { total: number; completed: number }>();
  for (const stat of completionStats) {
    const weekday = new Date(`${stat.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
    const prior = weekdayTotals.get(weekday) || { total: 0, completed: 0 };
    weekdayTotals.set(weekday, { total: prior.total + stat.total, completed: prior.completed + stat.completed });
  }
  const bestWeekday = [...weekdayTotals.entries()].filter(([, value]) => value.total > 0).sort((a, b) => b[1].completed / b[1].total - a[1].completed / a[1].total)[0];
  const bestHabit = [...(analyticsData?.habitStats || [])].filter((habit: any) => habit.totalLogs > 0).sort((a: any, b: any) => b.completedLogs / b.totalLogs - a.completedLogs / a.totalLogs)[0];

  if (!mounted) return <AnalyticsSkeleton />;

  if (fetchError) return <main className="premium-container min-h-[60vh] pt-24" role="alert"><section className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900 dark:bg-zinc-900 sm:p-8"><h1 className="text-xl font-semibold text-slate-950 dark:text-white">Your analytics couldn’t load</h1><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Check your connection and try again. Your habit records have not been changed.</p><button onClick={() => setReloadCount(value => value + 1)} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Try again</button></section></main>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20 pb-20"
    >
      {/* Header */}
      <div className="premium-container pt-24">
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
              {(['week', 'month', 'year'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={`min-h-11 flex-1 rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:flex-none sm:px-6 ${activeTab === tab
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
      <motion.div variants={itemVariants} className="premium-container pt-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[
            { icon: Flame, label: 'Current Streak', value: streaks.current, suffix: 'days', colorKey: 'orange', gradient: 'orange' },
            { icon: Target, label: 'Completion Rate', value: completionRate, suffix: '%', colorKey: 'indigo', gradient: 'indigo' },
            { icon: Sparkles, label: 'Days with activity', value: getConsistencyRate(), suffix: '%', colorKey: 'purple', gradient: 'purple' },
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

      {/* Trend + Heatmap */}
      <motion.div variants={itemVariants} className="premium-container pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Trend Insight */}
          <div className="lg:col-span-1 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-zinc-950/40 p-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Trend</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Week-over-week completion change</p>

            {loading ? (
              <div className="h-20 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/40 animate-pulse" />
            ) : completionStats.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm leading-relaxed text-slate-600 dark:border-zinc-700 dark:text-zinc-300">Log a few habits to see how your recent week compares with the previous one.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">This week</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{analyticsData?.trend?.thisWeekRate ?? 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Previous</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{analyticsData?.trend?.prevWeekRate ?? 0}%</span>
                </div>
                <div className="mt-4 rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Change</span>
                    <span className={`text-sm font-bold ${(analyticsData?.trend?.changePercent ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                      {(analyticsData?.trend?.changePercent ?? 0) >= 0 ? '+' : ''}{analyticsData?.trend?.changePercent ?? 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Heatmap (last 12 weeks) */}
          <div className="lg:col-span-2 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-zinc-950/40 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Activity Heatmap</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Last 12 weeks</p>
              </div>
              <div className="text-xs font-semibold text-zinc-500">
                {loading ? '—' : 'More completions → darker'}
              </div>
            </div>

            {loading ? (
              <div className="h-28 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/40 animate-pulse" />
            ) : Object.keys(analyticsData?.heatmap || {}).length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-600 dark:border-zinc-700 dark:text-zinc-300">Your completed habits will build this activity view over time.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <div className="inline-grid grid-rows-7 grid-flow-col gap-1">
                  {(() => {
                    const heatmap: Record<string, number> = analyticsData?.heatmap || {};
                    const days = 7 * 12;
                    const start = new Date();
                    start.setDate(start.getDate() - (days - 1));
                    const cells: Array<{ key: string; value: number }> = [];
                    for (let i = 0; i < days; i++) {
                      const d = new Date(start);
                      d.setDate(start.getDate() + i);
                      const key = d.toISOString().split('T')[0];
                      cells.push({ key, value: heatmap[key] || 0 });
                    }

                    const max = Math.max(...cells.map(c => c.value), 1);
                    return cells.map((c) => {
                      const intensity = c.value / max;
                      const cls =
                        c.value === 0 ? 'bg-zinc-200/60 dark:bg-zinc-800/60' :
                          intensity < 0.34 ? 'bg-indigo-300/70 dark:bg-indigo-500/40' :
                            intensity < 0.67 ? 'bg-indigo-500/70 dark:bg-indigo-500/70' :
                              'bg-indigo-700/80 dark:bg-indigo-400/80';
                      return (
                        <div
                          key={c.key}
                          title={`${c.key}: ${c.value} completion${c.value === 1 ? '' : 's'}`}
                          className={`w-3.5 h-3.5 rounded-[4px] ${cls} border border-white/30 dark:border-black/20`}
                        />
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Charts Section */}
      <div className="premium-container pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-zinc-950/40 p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Consistency Trend</h3>
                <p className="text-sm text-zinc-500 mt-1">Your activity over the past {activeTab === 'week' ? 'week' : activeTab === 'month' ? 'month' : 'year'}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-indigo-600" />
                <span className="text-sm font-medium text-zinc-500">Completion rate</span>
              </div>
            </div>

            <div className="h-[320px] w-full min-h-[320px]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-400 font-medium">Loading data...</span>
                  </div>
                </div>
              ) : weeklyData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-600 dark:border-zinc-700 dark:text-zinc-300">No habit history for this period yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 260 }}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorCompletionNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
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
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload || payload.length === 0) return null;
                        return (
                          <div style={{
                            backgroundColor: 'rgba(255,255,255,0.97)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(226,232,240,0.8)',
                            borderRadius: '16px',
                            padding: '14px 18px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                            minWidth: '160px',
                          }}>
                            <p style={{ fontWeight: 800, fontSize: '14px', color: '#18181b', marginBottom: '10px' }}>{label}</p>
                            {payload.map((entry: any, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.dataKey === 'completion' ? '#6366f1' : '#10b981', flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>{entry.dataKey}:</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#18181b', marginLeft: 'auto' }}>{entry.value}%</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
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
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* AI Insights & Category */}
          <div className="space-y-6 lg:space-y-8">
            <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-[#fbfaf7] p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300"><Sparkles size={17}/><h3 className="text-sm font-semibold">Patterns from your records</h3></div>
              {completionStats.length === 0 ? <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">As you log habits, this space will summarize patterns from your own activity.</p> : <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-zinc-200">
                {bestWeekday && <p>Your strongest recorded day is <strong>{bestWeekday[0]}</strong> ({Math.round(bestWeekday[1].completed / bestWeekday[1].total * 100)}% completion).</p>}
                {bestHabit && <p><strong>{bestHabit.name}</strong> has your highest completion rate ({Math.round(bestHabit.completedLogs / bestHabit.totalLogs * 100)}%).</p>}
                {!bestWeekday && !bestHabit && <p>There is not enough completed activity yet to identify a pattern.</p>}
              </div>}
              <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-zinc-700 dark:text-zinc-400">These are simple summaries of saved logs, not predictions.</p>
            </motion.div>

            {/* Focus Areas Pie Chart */}
            <motion.div variants={itemVariants} className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-zinc-950/40 p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Focus Areas</h3>

              <div className="relative h-[180px] min-h-[180px] w-full">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : categoryData.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-3 text-center text-sm text-slate-500">Complete some habits to see category activity.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 180 }}>
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
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: 'rgba(255,255,255,0.97)',
                              backdropFilter: 'blur(12px)',
                              border: '1px solid rgba(226,232,240,0.8)',
                              borderRadius: '14px',
                              padding: '10px 14px',
                              boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: data.color, flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, fontSize: '13px', color: '#18181b' }}>{data.name}</span>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: data.color, marginLeft: '8px' }}>{data.value}%</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {categoryData.length > 0 && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                    {loading ? '—' : `${completionRate}%`}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Total</span>
                </div>}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
      <motion.div variants={itemVariants} className="premium-container pt-10">
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
          ) : analyticsData?.habitStats?.length ? (
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
                    className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors group sm:p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{habit.name}</h4>
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">{habit.category}</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${statusColor === 'emerald' ? 'bg-emerald-400' :
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
                        className={`h-full rounded-full transition-all duration-500 ${statusColor === 'emerald' ? 'bg-emerald-400' :
                          statusColor === 'yellow' ? 'bg-yellow-400' : 'bg-rose-400'
                          }`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : <p className="rounded-xl border border-dashed border-white/20 px-4 py-8 text-center text-sm text-zinc-300">Your habit performance will appear here after you start logging habits.</p>}
        </div>
      </motion.div>

      {/* Footer spacing */}
      <div className="h-12" />
    </motion.div>
  );
}
