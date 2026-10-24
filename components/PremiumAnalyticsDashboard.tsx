'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Target,
  Trophy,
  Zap,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PlusCircle,
  MoveRight,
  Medal,
  Check,
  Scale,
  Plus,
  Trash2,
  History,
  TrendingDown,
  X,
  Clock,
  BarChart3,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ExecutivePerformanceReport from './ExecutivePerformanceReport';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';
import { Habit, DailyLog } from '@/types';
import { format, subDays } from 'date-fns';

type TimeRange = '7D' | '30D' | '90D' | 'Year';

interface CompletionStat {
  date: string;
  total: number;
  completed: number;
}

interface HabitStat {
  id: string;
  name: string;
  category: string;
  totalLogs: number;
  completedLogs: number;
}

export function PremiumAnalyticsDashboard() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [achievementsData, setAchievementsData] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    completed: number;
    total: number;
    rate: number;
  } | null>(null);

  const heatmapScrollRef = useRef<HTMLDivElement>(null);

  // Weight tracking states
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState<string>('70');
  const [weightDate, setWeightDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [weightNote, setWeightNote] = useState<string>('');
  const [activeView, setActiveView] = useState<'analytics' | 'report'>('analytics');
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightViewCadence, setWeightViewCadence] = useState<'daily' | 'monthly'>('daily');
  const [deletingWeightDate, setDeletingWeightDate] = useState<string | null>(null);
  const [isDeletingWeight, setIsDeletingWeight] = useState(false);

  useEffect(() => {
    if (analyticsData?.weightStats?.currentWeight) {
      setWeightInput(String(analyticsData.weightStats.currentWeight));
    }
  }, [analyticsData?.weightStats?.currentWeight]);

  const handleSaveWeight = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(weightInput);
    if (!Number.isFinite(num) || num < 25 || num > 400) {
      toast.error('Please enter a valid weight (25–400 kg)');
      return;
    }
    setSavingWeight(true);
    try {
      const res = await fetch('/api/user/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: num, date: weightDate, note: weightNote }),
      });
      if (!res.ok) throw new Error('Failed to save weight');
      toast.success(`Weight logged: ${num} kg for ${weightDate}!`);
      setWeightModalOpen(false);
      setWeightNote('');
      loadData();
    } catch {
      toast.error('Could not save weight');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleDeleteWeight = async (date: string) => {
    setIsDeletingWeight(true);
    // Optimistic UI update so entry vanishes immediately without waiting for network round-trip
    const prevAnalytics = analyticsData;
    setAnalyticsData((prev: any) => {
      if (!prev?.weightStats) return prev;
      const history = (prev.weightStats.history || []).filter((e: any) => e.date !== date);
      const newCurrent = history.length > 0 ? history[history.length - 1].weight : null;
      const newStarting = history.length > 0 ? history[0].weight : null;
      const newChange = newCurrent != null && newStarting != null ? +(newCurrent - newStarting).toFixed(1) : 0;
      
      const monthlyMap = new Map<string, { total: number; count: number; lastWeight: number }>();
      history.forEach((item: any) => {
        const monthKey = item.date.substring(0, 7);
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { total: 0, count: 0, lastWeight: item.weight });
        }
        const m = monthlyMap.get(monthKey)!;
        m.total += item.weight;
        m.count += 1;
        m.lastWeight = item.weight;
      });
      const monthlyStats = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        avgWeight: +(data.total / data.count).toFixed(1),
        lastWeight: data.lastWeight,
        logCount: data.count,
      }));

      return {
        ...prev,
        weightStats: {
          ...prev.weightStats,
          currentWeight: newCurrent,
          startingWeight: newStarting,
          totalChange: newChange,
          history,
          monthlyStats,
        },
      };
    });

    try {
      const res = await fetch(`/api/user/weight?date=${date}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Weight entry for ${date} removed`);
        setDeletingWeightDate(null);
        await loadData();
      } else {
        setAnalyticsData(prevAnalytics);
        toast.error('Failed to delete entry');
      }
    } catch {
      setAnalyticsData(prevAnalytics);
      toast.error('Failed to delete weight entry');
    } finally {
      setIsDeletingWeight(false);
      setDeletingWeightDate(null);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const rangeDays = useMemo(() => {
    switch (timeRange) {
      case '7D':
        return 7;
      case '30D':
        return 30;
      case '90D':
        return 90;
      case 'Year':
        return 365;
      default:
        return 30;
    }
  }, [timeRange]);

  // Load real user data from API with 401 handling
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const sevenDaysAgoStr = format(subDays(new Date(), 6), 'yyyy-MM-dd');

      const [habitsRes, analyticsRes, logsRes, achievementsRes] = await Promise.all([
        fetch('/api/habits', { cache: 'no-store' }),
        fetch(`/api/analytics?days=${rangeDays}`, { cache: 'no-store' }),
        fetch(`/api/logs?startDate=${sevenDaysAgoStr}&endDate=${todayStr}`, { cache: 'no-store' }),
        fetch('/api/achievements', { cache: 'no-store' }),
      ]);

      if (habitsRes.status === 401 || analyticsRes.status === 401) {
        router.push('/login');
        return;
      }

      if (habitsRes.ok) {
        const habitsJson = await habitsRes.json();
        setHabits(habitsJson.habits || []);
      }

      if (analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        setAnalyticsData(analyticsJson);
      }

      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        setRecentLogs(logsJson.logs || []);
      }

      if (achievementsRes.ok) {
        const achJson = await achievementsRes.json();
        setAchievementsData(achJson);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [rangeDays, router]);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, loadData]);

  // 1. Calculations: Active Streak & Personal Best
  const { activeStreak, personalBest } = useMemo(() => {
    if (!habits.length) return { activeStreak: 0, personalBest: 0 };
    const streaksMap = analyticsData?.streaks || {};

    let highestCurrent = 0;
    let highestLongest = 0;

    habits.forEach((h) => {
      const serverStreak = streaksMap[h.id];
      const cur = serverStreak?.current ?? h.streak ?? 0;
      const longest = Math.max(serverStreak?.longest ?? 0, h.longestStreak ?? 0, cur);
      if (cur > highestCurrent) highestCurrent = cur;
      if (longest > highestLongest) highestLongest = longest;
    });

    return {
      activeStreak: highestCurrent,
      personalBest: Math.max(highestLongest, highestCurrent),
    };
  }, [habits, analyticsData]);

  // Calculations: Weight Analytics & Progress
  const weightAnalysis = useMemo(() => {
    const rawHistory: Array<{ date: string; weight: number; note?: string }> = 
      analyticsData?.weightStats?.history || [];
    const monthlyStats: Array<{ month: string; avgWeight: number; lastWeight: number; logCount: number }> = 
      analyticsData?.weightStats?.monthlyStats || [];

    const currentWeight = analyticsData?.weightStats?.currentWeight ?? (rawHistory.length > 0 ? rawHistory[rawHistory.length - 1].weight : null);
    const startingWeight = analyticsData?.weightStats?.startingWeight ?? (rawHistory.length > 0 ? rawHistory[0].weight : currentWeight);
    const totalChange = analyticsData?.weightStats?.totalChange ?? 
      (currentWeight != null && startingWeight != null ? +(currentWeight - startingWeight).toFixed(1) : 0);
    const healthGoal = analyticsData?.weightStats?.healthGoal || 'maintain';
    const lastWeightUpdate = analyticsData?.weightStats?.lastWeightUpdate;

    const dailyChart = rawHistory.map((entry, idx) => {
      const prev = idx > 0 ? rawHistory[idx - 1].weight : entry.weight;
      const diff = +(entry.weight - prev).toFixed(1);
      return {
        date: entry.date,
        formattedDate: format(new Date(`${entry.date}T12:00:00`), 'MMM d'),
        weight: entry.weight,
        diff,
        note: entry.note,
      };
    });

    const monthlyChart = monthlyStats.map((item, idx) => {
      const [year, month] = item.month.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const prev = idx > 0 ? monthlyStats[idx - 1].lastWeight : item.lastWeight;
      const diff = +(item.lastWeight - prev).toFixed(1);
      return {
        month: item.month,
        formattedMonth: format(dateObj, 'MMM yyyy'),
        avgWeight: item.avgWeight,
        weight: item.lastWeight,
        diff,
        count: item.logCount,
      };
    });

    return {
      currentWeight,
      startingWeight,
      totalChange,
      healthGoal,
      lastWeightUpdate,
      dailyChart,
      monthlyChart,
      rawHistory,
    };
  }, [analyticsData?.weightStats]);

  // 2. Calculations: Overall Completion Rate & Trend Delta
  const { overallRate, scheduledTotal, completedTotal, trendDelta } = useMemo(() => {
    const stats: CompletionStat[] = analyticsData?.completionStats || [];
    const totalScheduled = stats.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalCompleted = stats.reduce((acc, s) => acc + (s.completed || 0), 0);
    const rate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    const delta = analyticsData?.trend?.changePercent ?? 0;

    return {
      overallRate: rate,
      scheduledTotal: totalScheduled,
      completedTotal: totalCompleted,
      trendDelta: delta,
    };
  }, [analyticsData]);

  // 3. Calculations: Momentum Score (0-100 weighted consistency index)
  const { momentumScore, momentumLabel, momentumTone, momentumBg } = useMemo(() => {
    const stats: CompletionStat[] = analyticsData?.completionStats || [];
    if (!stats.length || scheduledTotal === 0) {
      return {
        momentumScore: 0,
        momentumLabel: 'Starting',
        momentumTone: 'text-slate-400',
        momentumBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
      };
    }

    const last30 = stats.slice(-30);
    let consecutiveMisses = 0;
    let singleMisses = 0;

    for (let i = 0; i < last30.length; i++) {
      const cur = last30[i];
      if (cur.total > 0 && cur.completed === 0) {
        if (i > 0 && last30[i - 1].total > 0 && last30[i - 1].completed === 0) {
          consecutiveMisses += 1;
        } else {
          singleMisses += 1;
        }
      }
    }

    const penalty = consecutiveMisses * 8 + singleMisses * 2;
    const streakBonus = activeStreak >= 7 ? 6 : activeStreak >= 3 ? 3 : 0;
    const rawScore = overallRate - penalty + streakBonus;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    let label = 'Steady Rhythm';
    let tone = 'text-emerald-600 dark:text-emerald-400';
    let bg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

    if (score >= 80) {
      label = 'Peak Momentum';
      tone = 'text-emerald-600 dark:text-emerald-400';
      bg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    } else if (score >= 60) {
      label = 'Building Steadily';
      tone = 'text-violet-600 dark:text-violet-400';
      bg = 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
    } else if (score >= 40) {
      label = 'Moderate Consistency';
      tone = 'text-amber-600 dark:text-amber-400';
      bg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    } else {
      label = 'Needs Focus';
      tone = 'text-rose-600 dark:text-rose-400';
      bg = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }

    return { momentumScore: score, momentumLabel: label, momentumTone: tone, momentumBg: bg };
  }, [analyticsData, scheduledTotal, overallRate, activeStreak]);

  // 4. Calculations: Perfect Days (100% scheduled habits completed)
  const { perfectDaysCount, trackedDaysCount, perfectDaysPct } = useMemo(() => {
    const stats: CompletionStat[] = analyticsData?.completionStats || [];
    const daysWithScheduled = stats.filter((s) => s.total > 0);
    const perfects = daysWithScheduled.filter((s) => s.completed >= s.total).length;
    const pct = daysWithScheduled.length > 0 ? Math.round((perfects / daysWithScheduled.length) * 100) : 0;

    return {
      perfectDaysCount: perfects,
      trackedDaysCount: daysWithScheduled.length,
      perfectDaysPct: pct,
    };
  }, [analyticsData]);

  // 5. 365-Day Consistency Heatmap Grid (52 weeks x 7 days)
  const { heatmapDays, monthMarkers } = useMemo(() => {
    const days = [];
    const today = new Date();
    const heatmapDict: Record<string, number> = analyticsData?.heatmap || {};
    const statsMap = new Map<string, CompletionStat>();
    (analyticsData?.completionStats || []).forEach((s: CompletionStat) => {
      statsMap.set(s.date, s);
    });

    const activeHabitCount = Math.max(habits.filter((h) => h.active !== false).length, 1);
    const markers: { weekIdx: number; label: string }[] = [];
    let prevMonth = -1;

    for (let i = 363; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
      const weekIdx = Math.floor((363 - i) / 7);

      // Track month labels at top of columns
      const monthNum = d.getMonth();
      if (monthNum !== prevMonth && (363 - i) % 7 === 0) {
        markers.push({ weekIdx, label: format(d, 'MMM') });
        prevMonth = monthNum;
      }

      const stat = statsMap.get(dateStr);
      const completed = stat ? stat.completed : heatmapDict[dateStr] || 0;
      const total = stat && stat.total > 0 ? stat.total : activeHabitCount;
      const rate = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (completed > 0) {
        if (rate >= 90) level = 4;
        else if (rate >= 65) level = 3;
        else if (rate >= 35) level = 2;
        else level = 1;
      }

      days.push({
        date: dateStr,
        displayDate: format(d, 'EEE, MMM d, yyyy'),
        dayOfWeek,
        completed,
        total,
        rate,
        level,
        weekIdx,
      });
    }
    return { heatmapDays: days, monthMarkers: markers };
  }, [analyticsData, habits]);

  // Auto-scroll heatmap to the right on load
  useEffect(() => {
    if (heatmapScrollRef.current) {
      heatmapScrollRef.current.scrollLeft = heatmapScrollRef.current.scrollWidth;
    }
  }, [heatmapDays]);

  // 6. Categories for Velocity Filter & Domain Balance
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    habits.forEach((h) => {
      if (h.category) cats.add(h.category);
    });
    return ['All', ...Array.from(cats)];
  }, [habits]);

  // 7. Habit Velocity Spline Chart Data
  const velocityChartData = useMemo(() => {
    const stats: CompletionStat[] = analyticsData?.completionStats || [];
    if (!stats.length) return [];

    return stats.map((s) => {
      const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      const d = new Date(`${s.date}T12:00:00`);
      return {
        date: format(d, timeRange === '7D' ? 'EEE' : timeRange === 'Year' ? 'MMM d' : 'd'),
        fullDate: s.date,
        completion: rate,
        completed: s.completed,
        total: s.total,
      };
    });
  }, [analyticsData, timeRange]);

  // 8. Life Domain / Category Breakdown
  const domainBreakdown = useMemo(() => {
    const habitStatsList: HabitStat[] = analyticsData?.habitStats || [];
    const catMap = new Map<string, { total: number; completed: number; habitCount: number }>();

    habits.forEach((h) => {
      const cat = h.category || 'General';
      if (!catMap.has(cat)) catMap.set(cat, { total: 0, completed: 0, habitCount: 0 });
      const record = catMap.get(cat)!;
      record.habitCount += 1;
    });

    habitStatsList.forEach((stat) => {
      const cat = stat.category || 'General';
      if (!catMap.has(cat)) catMap.set(cat, { total: 0, completed: 0, habitCount: 1 });
      const record = catMap.get(cat)!;
      record.total += stat.totalLogs || 0;
      record.completed += stat.completedLogs || 0;
    });

    const domains = Array.from(catMap.entries()).map(([domain, data]) => {
      const score = data.total > 0 ? Math.round((data.completed / data.total) * 100) : data.completed > 0 ? 100 : 0;
      return {
        domain,
        score,
        total: data.total,
        completed: data.completed,
        habitCount: data.habitCount,
      };
    });

    return domains.sort((a, b) => b.score - a.score);
  }, [habits, analyticsData]);

  // 9. Day of Week Efficiency Matrix
  const weekdayEfficiency = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets: Record<number, { completed: number; total: number }> = {
      0: { completed: 0, total: 0 },
      1: { completed: 0, total: 0 },
      2: { completed: 0, total: 0 },
      3: { completed: 0, total: 0 },
      4: { completed: 0, total: 0 },
      5: { completed: 0, total: 0 },
      6: { completed: 0, total: 0 },
    };

    const stats: CompletionStat[] = analyticsData?.completionStats || [];
    stats.forEach((s) => {
      const d = new Date(`${s.date}T12:00:00`);
      const dayIdx = d.getDay();
      buckets[dayIdx].total += s.total || 0;
      buckets[dayIdx].completed += s.completed || 0;
    });

    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((dayIdx) => {
      const b = buckets[dayIdx];
      const rate = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
      return {
        day: dayNames[dayIdx],
        completion: rate,
        dropoff: Math.max(0, 100 - rate),
      };
    });
  }, [analyticsData]);

  const bestDay = useMemo(() => {
    if (!weekdayEfficiency.length) return null;
    return [...weekdayEfficiency].sort((a, b) => b.completion - a.completion)[0];
  }, [weekdayEfficiency]);

  // 10. Habit Leaderboard with Real 7-Day History
  const habitLeaderboard = useMemo(() => {
    if (!habits.length) return [];
    const habitStatsMap = new Map<string, HabitStat>();
    (analyticsData?.habitStats || []).forEach((hs: HabitStat) => habitStatsMap.set(hs.id, hs));
    const streaksMap = analyticsData?.streaks || {};

    const today = new Date();
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      last7Days.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }

    return habits.map((habit) => {
      const serverStat = habitStatsMap.get(habit.id);
      const serverStreak = streaksMap[habit.id];

      const currentStreak = serverStreak?.current ?? habit.streak ?? 0;
      const totalLogs = serverStat?.totalLogs || 0;
      const completedLogs = serverStat?.completedLogs || 0;
      const successRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : currentStreak > 0 ? 100 : 0;

      const history7d = last7Days.map((dateStr) => {
        return recentLogs.some(
          (log) => log.habitId === habit.id && log.date === dateStr && log.completed
        );
      });

      let riskStatus: 'on_fire' | 'stable' | 'at_risk' = 'stable';
      if (currentStreak >= 7 || successRate >= 80) riskStatus = 'on_fire';
      else if (successRate < 45 && currentStreak === 0) riskStatus = 'at_risk';

      return {
        id: habit.id,
        name: habit.name,
        category: habit.category || 'General',
        streak: currentStreak,
        personalBest: Math.max(serverStreak?.longest ?? 0, habit.longestStreak ?? 0, currentStreak),
        rate30d: successRate,
        riskStatus,
        history7d,
      };
    }).sort((a, b) => b.streak - a.streak || b.rate30d - a.rate30d);
  }, [habits, analyticsData, recentLogs]);

  // Theme-adaptive chart colors
  const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)';
  const chartAxisColor = isDarkMode ? '#94A3B8' : '#64748B';
  const tooltipBg = isDarkMode ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDarkMode ? '#1E293B' : '#E2E8F0';
  const tooltipText = isDarkMode ? '#F8FAFC' : '#0F172A';

  // Smooth Skeleton Loader for Initial Load
  if (loading && !analyticsData) {
    return (
      <main className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 px-1 sm:px-0 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-xl shimmer-skeleton" />
            <div className="h-4 w-72 rounded-lg shimmer-skeleton" />
          </div>
          <div className="h-10 w-64 rounded-2xl shimmer-skeleton" />
        </div>

        {/* 4 KPI Ribbons Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 rounded-md shimmer-skeleton" />
                <div className="h-8 w-8 rounded-xl shimmer-skeleton" />
              </div>
              <div className="h-6 w-16 rounded-lg shimmer-skeleton" />
            </div>
          ))}
        </div>

        {/* 2 Main Chart Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-80 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 space-y-4">
            <div className="h-4 w-40 rounded-md shimmer-skeleton" />
            <div className="h-60 w-full rounded-2xl shimmer-skeleton" />
          </div>
          <div className="h-80 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 space-y-4">
            <div className="h-4 w-32 rounded-md shimmer-skeleton" />
            <div className="h-60 w-full rounded-2xl shimmer-skeleton" />
          </div>
        </div>

        {/* Weight Skeleton */}
        <div className="h-72 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 space-y-4">
          <div className="h-5 w-48 rounded-md shimmer-skeleton" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl shimmer-skeleton" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Empty State if user has no habits yet
  if (!loading && habits.length === 0) {
    return (
      <main className="w-full max-w-7xl mx-auto space-y-6 px-2 sm:px-0">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Habit Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Consistency engine, rhythm analytics, and habit trajectory.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 sm:p-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
            <Target size={30} />
          </div>
          <h2 className="mt-5 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            Your analytics journey starts here
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Create your daily habits to unlock real-time consistency heatmaps, velocity tracking curves,
            and life domain balance metrics.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/dashboard/habits/new"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all active:scale-98"
            >
              <PlusCircle size={16} />
              Create your first habit
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 px-1 sm:px-0">
      {/* Ambient Parallax Depth Glow Orbs (GPU compositor hardware-accelerated for smooth 60/120fps on mobile & laptop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-16 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl animate-ambient-float"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-16 w-96 h-96 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl animate-ambient-float"
        style={{ animationDelay: '-6s' }}
      />

      {/* HEADER WITH SEGMENTED TIME-RANGE CONTROLS & VIEW TOGGLE */}
      <header className="relative z-10 animate-entrance flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeView === 'report' ? 'Performance Report' : 'Habit Analytics'}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <Sparkles size={11} /> {activeView === 'report' ? 'Diagnostic Audit' : 'Live Engine'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeView === 'report'
              ? 'Comprehensive performance audit with written diagnostics of lags and strategic focus areas.'
              : 'Real consistency data, velocity baselines, and life domain intelligence.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* View Switcher: Dashboard vs Report */}
          <div className="flex items-center rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 p-1 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveView('analytics')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                activeView === 'analytics'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 size={13} />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('report')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                activeView === 'report'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={13} />
              <span>Diagnostic Report</span>
            </button>
          </div>

          {/* Apple-style Segmented Time-Range Selector */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1 w-full sm:w-auto p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
            {(['7D', '30D', '90D', 'Year'] as TimeRange[]).map((range) => {
              const isSelected = timeRange === range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`relative px-3 sm:px-3.5 py-1.5 text-center text-xs font-bold rounded-xl transition-all duration-200 active-press ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/70 scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {activeView === 'report' ? (
        <ExecutivePerformanceReport
          habits={habits}
          analyticsData={analyticsData}
          achievementsData={achievementsData}
          timeRangeLabel={
            timeRange === '7D' ? 'Last 7 Days (1 Week)' :
            timeRange === '30D' ? 'Last 30 Days (1 Month)' :
            timeRange === '90D' ? 'Last 90 Days (Quarter)' :
            'Last 365 Days (1 Year)'
          }
          startDate={analyticsData?.startDate}
          endDate={analyticsData?.endDate}
          onPrint={() => window.print()}
        />
      ) : (
        <>

      {/* MODULE 1: EXECUTIVE KPI RIBBON */}
      <section className="relative z-10 animate-entrance [animation-delay:60ms] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Card 1: Active Streak */}
        <div className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-5 shadow-xs hover-lift hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Active Streak</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 border border-orange-100 dark:border-orange-900/50 shadow-xs group-hover:scale-110 transition-transform">
              <Flame size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
              {activeStreak}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Days Consecutive
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Personal Best</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
              {personalBest} Days <span className="text-orange-500">🔥</span>
            </span>
          </div>
        </div>

        {/* Card 2: Completion Rate */}
        <div className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-5 shadow-xs hover-lift hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Completion Rate</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 shadow-xs group-hover:scale-110 transition-transform">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
              {overallRate}%
            </span>
            {trendDelta !== 0 && (
              <span
                className={`inline-flex items-center text-xs font-bold ${
                  trendDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                {trendDelta > 0 ? (
                  <ArrowUpRight size={13} className="mr-0.5" />
                ) : (
                  <ArrowDownRight size={13} className="mr-0.5" />
                )}
                {Math.abs(trendDelta)}% vs prior
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Executed vs Scheduled</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {completedTotal} / {scheduledTotal} done
            </span>
          </div>
        </div>

        {/* Card 3: Momentum Score */}
        <div className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-5 shadow-xs hover-lift hover:border-violet-300 dark:hover:border-violet-700/60 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Momentum Score</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50 shadow-xs group-hover:scale-110 transition-transform">
              <Zap size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
              {momentumScore}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Consistency Index</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${momentumBg}`}>
              {momentumLabel}
            </span>
          </div>
        </div>

        {/* Card 4: Perfect Days */}
        <div className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-5 shadow-xs hover-lift hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Perfect Days</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-100 dark:border-amber-900/50 shadow-xs group-hover:scale-110 transition-transform">
              <Trophy size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
              {perfectDaysCount}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              100% Completed
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Consistency Ratio</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {perfectDaysPct}% of tracked days
            </span>
          </div>
        </div>
      </section>

      {/* QUICK BANNER: VIEW DIAGNOSTIC REPORT WITH WRITTEN LAGS & FOCUS ANALYSIS */}
      <div className="relative z-10 animate-entrance [animation-delay:100ms] flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs hover-lift">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <FileText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Diagnostic Analysis
              </span>
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.2 text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                Written Lags & Focus
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              Executive Performance & Drop-Off Diagnostic Report
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Read comprehensive written diagnostics highlighting slipping habits, temporal day-of-week lags, and prioritized action protocols.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveView('report')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 self-start sm:self-auto shrink-0 active-press"
        >
          <span>Open Full Report</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* MODULE 2: 365-DAY CONSISTENCY HEATMAP */}
      <section className="relative z-10 animate-entrance [animation-delay:140ms] rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-6 shadow-xs hover-lift">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                365-Day Consistency Heatmap
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily habit completions recorded over the past 52 weeks
            </p>
          </div>

          {/* Intensity Legend */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 self-start sm:self-auto">
            <span>Less</span>
            <span className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            <span className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-950/80" />
            <span className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-800" />
            <span className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
            <span className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap with Row Day Labels and Month Header */}
        <div
          ref={heatmapScrollRef}
          className="overflow-x-auto pb-2 scroll-smooth"
        >
          <div className="min-w-[700px] select-none">
            {/* Month markers header */}
            <div className="flex text-[10px] font-bold text-slate-400 mb-1.5 pl-6">
              {monthMarkers.map((m, idx) => (
                <span
                  key={idx}
                  style={{ marginLeft: idx === 0 ? 0 : '36px' }}
                  className="w-8 text-left"
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex items-start gap-1.5">
              {/* Day Labels (Mon, Wed, Fri) */}
              <div className="flex flex-col justify-between h-[105px] text-[9px] font-bold text-slate-400 pr-1 py-0.5">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>

              {/* Grid 52 weeks x 7 days */}
              <div className="inline-grid grid-rows-7 grid-flow-col gap-1">
                {heatmapDays.map((cell) => {
                  const levelStyles = [
                    'bg-slate-100 dark:bg-slate-800/60 hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600 border border-slate-200/40 dark:border-transparent',
                    'bg-emerald-200 dark:bg-emerald-950/80 hover:ring-2 hover:ring-emerald-400 dark:hover:ring-emerald-700',
                    'bg-emerald-300 dark:bg-emerald-800 hover:ring-2 hover:ring-emerald-500',
                    'bg-emerald-500 dark:bg-emerald-600 hover:ring-2 hover:ring-emerald-600 dark:hover:ring-emerald-400',
                    'bg-emerald-600 dark:bg-emerald-400 hover:ring-2 hover:ring-emerald-700 dark:hover:ring-emerald-300',
                  ][cell.level];

                  const handleSelect = () => {
                    setHoveredCell({
                      date: cell.displayDate,
                      completed: cell.completed,
                      total: cell.total,
                      rate: cell.rate,
                    });
                  };

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={handleSelect}
                      onTouchStart={handleSelect}
                      onMouseEnter={handleSelect}
                      className={`h-3 w-3 rounded-[3px] transition cursor-pointer outline-none focus:ring-1 focus:ring-emerald-500 ${levelStyles}`}
                      aria-label={`${cell.displayDate}: ${cell.completed}/${cell.total} completed`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Hover / Tap Status Bar with mobile swipe hint */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">
          {hoveredCell ? (
            <span className="font-medium text-slate-900 dark:text-white">
              {hoveredCell.date} —{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {hoveredCell.completed} of {hoveredCell.total} habits completed ({hoveredCell.rate}%)
              </strong>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] sm:text-xs">
              <span>Hover or tap any square to inspect details</span>
              <span className="hidden sm:inline text-slate-400">• Current week on far right</span>
            </span>
          )}
          <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 self-start sm:self-auto">
            52 Weeks Tracked
          </span>
        </div>
      </section>

      {/* ROW: VELOCITY SPLINE CHART & LIFE DOMAIN BALANCE */}
      <div className="relative z-10 animate-entrance [animation-delay:180ms] grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* MODULE 3: HABIT VELOCITY VS 85% TARGET BASELINE */}
        <section className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-lift">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Habit Velocity vs. 85% Target Baseline
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily consistency curve against optimal performance standard
                </p>
              </div>

              {/* Dynamic Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categoriesList.slice(0, 5).map((c) => {
                  const active = selectedCategory === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCategory(c)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-200 active-press ${
                        active
                          ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spline Area Chart */}
            <div className="h-60 sm:h-72 w-full pt-2">
              {mounted && velocityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 450, height: 240 }}>
                  <AreaChart data={velocityChartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={isDarkMode ? 0.35 : 0.22} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke={chartAxisColor} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={chartAxisColor} fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} width={34} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: tooltipText,
                        boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(15,23,42,0.08)',
                      }}
                      formatter={(val: any) => [`${val}%`, 'Daily Completion']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    />
                    <ReferenceLine
                      y={85}
                      stroke={isDarkMode ? '#F59E0B' : '#D97706'}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Target 85%',
                        fill: isDarkMode ? '#F59E0B' : '#D97706',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completion"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#velocityGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                  {loading ? 'Calculating velocity...' : 'No velocity data recorded for this time frame.'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 sm:pt-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Average Velocity: <strong className="text-slate-900 dark:text-white">{overallRate}%</strong>
            </span>
            <span className="text-amber-600 dark:text-amber-500 font-semibold">Dotted Line: 85% Target Baseline</span>
          </div>
        </section>

        {/* MODULE 4: LIFE DOMAIN BALANCE */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-lift">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target size={18} className="text-violet-600 dark:text-violet-400" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Life Domain Balance
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Distribution & consistency across your habit categories
            </p>

            {/* Radar Chart (Render if >= 3 categories exist) */}
            {domainBreakdown.length >= 3 ? (
              <div className="h-44 sm:h-48 w-full flex items-center justify-center">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 260, height: 180 }}>
                    <RadarChart cx="50%" cy="50%" outerRadius="66%" data={domainBreakdown}>
                      <PolarGrid stroke={chartGridColor} />
                      <PolarAngleAxis dataKey="domain" stroke={chartAxisColor} fontSize={9} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="transparent" />
                      <Radar
                        name="Domain Score"
                        dataKey="score"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fill="#8B5CF6"
                        fillOpacity={isDarkMode ? 0.3 : 0.2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                )}
              </div>
            ) : null}
          </div>

          {/* Category Progress Bars */}
          <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs">
            {domainBreakdown.length ? (
              domainBreakdown.map((d) => (
                <div key={d.domain} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {d.domain} <span className="text-[10px] text-slate-400">({d.habitCount} habits)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{d.score}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        d.score >= 80
                          ? 'bg-emerald-500'
                          : d.score >= 50
                          ? 'bg-violet-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-2">No category data yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* ROW: DAY-OF-WEEK MATRIX & HABIT LEADERBOARD */}
      <div className="relative z-10 animate-entrance [animation-delay:240ms] grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* MODULE 5: DAY-OF-WEEK EFFICIENCY MATRIX */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-lift">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Efficiency Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Day-of-week completion rate and pattern drop-offs
            </p>

            {/* Day of Week Bar Chart */}
            <div className="h-44 w-full">
              {mounted && weekdayEfficiency.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 260, height: 170 }}>
                  <BarChart data={weekdayEfficiency} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid stroke={chartGridColor} vertical={false} />
                    <XAxis dataKey="day" stroke={chartAxisColor} fontSize={10} tickLine={false} />
                    <YAxis stroke={chartAxisColor} fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '10px',
                        fontSize: '11px',
                        color: tooltipText,
                        boxShadow: isDarkMode ? '0 6px 20px rgba(0,0,0,0.5)' : '0 6px 20px rgba(15,23,42,0.08)',
                      }}
                      formatter={(val: any) => [`${val}%`, 'Completion']}
                    />
                    <Bar dataKey="completion" fill={isDarkMode ? '#10B981' : '#059669'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                  Calculating weekday distribution...
                </div>
              )}
            </div>
          </div>

          {/* Peak Day Insight */}
          <div className="mt-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 p-3 text-xs">
            {bestDay ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Peak Consistency Day</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {bestDay.day}
                  </p>
                </div>
                <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {bestDay.completion}% Success
                </span>
              </div>
            ) : (
              <p className="text-slate-400">Log habits to discover your peak weekday.</p>
            )}
          </div>
        </section>

        {/* MODULE 6: HABIT LEADERBOARD & STREAK HEALTH TABLE */}
        <section className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-lift">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Habit Leaderboard & Streak Health
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {habitLeaderboard.length} habits tracked
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
              <span>Real-time habit performance & consistency</span>
              <span className="text-[11px] text-slate-400 sm:hidden">Swipe table →</span>
            </div>

            {/* Mobile Scrollable Table */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-2.5 w-10 text-center">#</th>
                    <th className="pb-2.5">Habit</th>
                    <th className="pb-2.5">Category</th>
                    <th className="pb-2.5 text-center">Past 7 Days</th>
                    <th className="pb-2.5 text-center">Streak</th>
                    <th className="pb-2.5 text-right">Success</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {habitLeaderboard.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 text-center font-mono font-bold text-slate-400">
                        {idx === 0 ? (
                          <span className="text-amber-500 font-black">1</span>
                        ) : idx === 1 ? (
                          <span className="text-slate-500 font-black">2</span>
                        ) : idx === 2 ? (
                          <span className="text-amber-700 dark:text-amber-600 font-black">3</span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="py-3 pr-2 font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
                        {item.name}
                      </td>
                      <td className="py-3 pr-2">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      {/* Real 7-day history dots */}
                      <td className="py-3 px-2 text-center">
                        <div className="inline-flex items-center gap-1">
                          {item.history7d.map((done, i) => (
                            <span
                              key={i}
                              title={done ? 'Completed' : 'Missed / Unscheduled'}
                              className={`h-2.5 w-2.5 rounded-full transition ${
                                done
                                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500/30'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {item.streak > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-orange-500">
                            {item.streak} <Flame size={12} />
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 pl-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.rate30d}%
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {item.riskStatus === 'on_fire' ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                            On Fire
                          </span>
                        ) : item.riskStatus === 'stable' ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                            Consistent
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                            At Risk
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 sm:pt-3 text-xs text-slate-500 dark:text-slate-400">
            <span>7-day history: green dot indicates completion</span>
            <Link
              href="/dashboard/habits"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-xs"
            >
              Manage habits <MoveRight size={13} />
            </Link>
          </div>
        </section>
      </div>

        {/* MODULE: BODY WEIGHT & PHYSICAL PROGRESS (MONTHLY & DAILY) */}
        <section className="relative z-10 animate-entrance [animation-delay:300ms] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 p-4 sm:p-6 lg:p-7 shadow-xs space-y-6 hover-lift">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 shadow-xs">
                <Scale size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Physical Metric
                  </span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    Monthly Cadence • Daily Available
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  Body Weight & Physical Progress
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track daily check-ins or monthly calibrations to visualize body transformation and consistency.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
              {/* Daily vs Monthly Cadence Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100/90 dark:bg-slate-800/80 p-1 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <button
                  type="button"
                  onClick={() => setWeightViewCadence('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    weightViewCadence === 'daily'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Daily Logs
                </button>
                <button
                  type="button"
                  onClick={() => setWeightViewCadence('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    weightViewCadence === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Monthly Cadence
                </button>
              </div>

              {/* Quick Action Button */}
              <button
                type="button"
                onClick={() => {
                  setWeightDate(format(new Date(), 'yyyy-MM-dd'));
                  setWeightModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Plus size={14} />
                <span>Log Weight</span>
              </button>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Weight</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                {weightAnalysis.currentWeight ? `${weightAnalysis.currentWeight} kg` : '—'}
              </div>
              <p className="text-[11px] text-slate-500 capitalize mt-0.5">
                Goal: {weightAnalysis.healthGoal === 'loss' ? 'Fat Loss' : weightAnalysis.healthGoal === 'gain' ? 'Muscle Gain' : 'Maintain'}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Change</span>
              <div className={`text-xl sm:text-2xl font-black mt-0.5 flex items-center gap-1 font-mono ${
                weightAnalysis.totalChange < 0 
                  ? (weightAnalysis.healthGoal === 'loss' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')
                  : weightAnalysis.totalChange > 0 
                  ? (weightAnalysis.healthGoal === 'gain' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400')
                  : 'text-slate-900 dark:text-white'
              }`}>
                {weightAnalysis.totalChange > 0 ? `+${weightAnalysis.totalChange}` : `${weightAnalysis.totalChange}`} kg
                {weightAnalysis.totalChange < 0 ? (
                  <TrendingDown size={18} />
                ) : weightAnalysis.totalChange > 0 ? (
                  <TrendingUp size={18} />
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                From {weightAnalysis.startingWeight ? `${weightAnalysis.startingWeight} kg baseline` : 'first log'}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Logged Entries</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                {weightAnalysis.dailyChart.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {weightAnalysis.monthlyChart.length} {weightAnalysis.monthlyChart.length === 1 ? 'Month' : 'Months'} active
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Last Check-In</span>
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 truncate">
                {weightAnalysis.lastWeightUpdate ? format(new Date(weightAnalysis.lastWeightUpdate), 'MMM d, yyyy') : 'No check-ins yet'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Calibration status
              </p>
            </div>
          </div>

          {/* Chart or Baseline Benchmark View */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-600 dark:text-indigo-400" />
                {weightViewCadence === 'daily' ? 'Daily Progression Timeline' : 'Monthly Weight Averages'}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Weight in kilograms (kg)
              </span>
            </div>

            {/* Condition 1: 2 or more logs -> Rich Recharts AreaChart */}
            {(weightViewCadence === 'daily' ? weightAnalysis.dailyChart : weightAnalysis.monthlyChart).length >= 2 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weightViewCadence === 'daily' ? weightAnalysis.dailyChart : weightAnalysis.monthlyChart}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis
                      dataKey={weightViewCadence === 'daily' ? 'formattedDate' : 'formattedMonth'}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                    />
                    <YAxis
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                      tickFormatter={(val) => `${val}kg`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 shadow-lg text-xs space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {weightViewCadence === 'daily' ? d.date : d.month}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {d.weight} kg
                              </span>
                              {d.diff !== 0 && (
                                <span className={`text-[10px] font-bold ${d.diff > 0 ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                  ({d.diff > 0 ? `+${d.diff}` : d.diff} kg)
                                </span>
                              )}
                            </div>
                            {d.note && (
                              <p className="text-[11px] text-slate-500 italic max-w-[180px]">{d.note}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#weightGrad)"
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: isDarkMode ? '#0f172a' : '#ffffff' }}
                      activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (weightViewCadence === 'daily' ? weightAnalysis.dailyChart : weightAnalysis.monthlyChart).length === 1 ? (
              /* Condition 2: Exactly 1 log -> High-end Baseline Benchmark card */
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/50 via-slate-50/30 to-white dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900/80 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                      <Scale size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Baseline Established
                        </span>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          {weightAnalysis.dailyChart[0]?.weight} kg
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">
                        First calibration recorded for {format(new Date(`${weightAnalysis.dailyChart[0]?.date}T12:00:00`), 'MMMM d, yyyy')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                        Your starting baseline is established. Log a second check-in (tomorrow or next month) to activate continuous trajectory curves, moving averages, and velocity trends.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWeightDate(format(new Date(), 'yyyy-MM-dd'));
                      setWeightModalOpen(true);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition"
                  >
                    <Plus size={14} />
                    <span>Log Next Entry</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Condition 3: 0 logs -> Clean empty state */
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Scale size={22} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No weight logs recorded yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Log your weight monthly or daily to view your physical progression timeline here.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setWeightDate(format(new Date(), 'yyyy-MM-dd'));
                    setWeightModalOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  <span>Log First Weight</span>
                </button>
              </div>
            )}
          </div>

          {/* Activity Feed: Recorded Check-In Entries (Modern timeline card list replacing old table) */}
          {weightAnalysis.dailyChart.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <History size={14} className="text-slate-400" />
                  <span>Recorded Check-Ins</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {weightAnalysis.dailyChart.length} {weightAnalysis.dailyChart.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                  Click trash to remove any entry
                </span>
              </div>

              <div className="space-y-2.5">
                {weightAnalysis.dailyChart.slice(-10).reverse().map((entry: any) => {
                  const isConfirming = deletingWeightDate === entry.date;
                  return (
                    <div
                      key={entry.date}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700/80 transition-all duration-200 shadow-xs"
                    >
                      {/* Left: Date & Note */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Calendar size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                              {format(new Date(`${entry.date}T12:00:00`), 'MMMM d, yyyy')}
                            </span>
                            {entry.date === format(new Date(), 'yyyy-MM-dd') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                Today
                              </span>
                            )}
                          </div>
                          {entry.note ? (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                              "{entry.note}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 mt-0.5">Physical check-in</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Value, Delta & Inline Delete Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {entry.weight} kg
                          </span>
                          {entry.diff !== 0 ? (
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              entry.diff < 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40'
                            }`}>
                              {entry.diff > 0 ? `+${entry.diff}` : entry.diff} kg
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              Baseline
                            </span>
                          )}
                        </div>

                        {/* Delete action with inline confirmation */}
                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mr-1 hidden xs:inline">
                              Delete?
                            </span>
                            <button
                              type="button"
                              disabled={isDeletingWeight}
                              onClick={() => handleDeleteWeight(entry.date)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition disabled:opacity-50"
                            >
                              {isDeletingWeight ? 'Deleting…' : 'Yes'}
                            </button>
                            <button
                              type="button"
                              disabled={isDeletingWeight}
                              onClick={() => setDeletingWeightDate(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingWeightDate(entry.date)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                            title="Delete this entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal: Log Body Weight (Daily or Monthly) */}
          {weightModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Scale size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Log Body Weight
                      </h3>
                      <p className="text-xs text-slate-500">Record a daily check-in or monthly calibration</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeightModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveWeight} className="space-y-4">
                  {/* Weight Input with Steppers */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Body Weight (kg)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseFloat(weightInput) || 70;
                          setWeightInput(String(Math.max(25, Math.round((cur - 0.5) * 10) / 10)));
                        }}
                        className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 hover:scale-105 active:bg-indigo-600 active:text-white transition-all shadow-xs"
                      >
                        –
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        min="25"
                        max="400"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        required
                        className="flex-1 h-12 text-center text-xl font-black bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:scale-[1.01] focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseFloat(weightInput) || 70;
                          setWeightInput(String(Math.min(400, Math.round((cur + 0.5) * 10) / 10)));
                        }}
                        className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 hover:scale-105 active:bg-indigo-600 active:text-white transition-all shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Date Input (Daily selection allowed!) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      value={weightDate}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setWeightDate(e.target.value)}
                      required
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400">You can log today's daily weigh-in or any past monthly check-in.</p>
                  </div>

                  {/* Optional Note */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Optional Note
                    </label>
                    <input
                      type="text"
                      value={weightNote}
                      onChange={(e) => setWeightNote(e.target.value)}
                      placeholder="e.g., Morning weigh-in, post-run"
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setWeightModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingWeight}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50"
                    >
                      {savingWeight ? 'Saving…' : 'Save Weight'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
        </>
      )}
    </main>
  );
}
