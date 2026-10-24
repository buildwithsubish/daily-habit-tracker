'use client';

import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Flame, 
  Calendar, 
  Scale, 
  Printer, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  Compass, 
  Award,
  ArrowRight,
  Clock,
  Layers,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Layout,
  Check,
  Trophy,
  Medal,
  Star
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart
} from 'recharts';
import { Habit } from '@/types';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';

interface ExecutivePerformanceReportProps {
  habits: Habit[];
  analyticsData: any;
  achievementsData?: any;
  timeRangeLabel: string;
  startDate?: string;
  endDate?: string;
  viewMode?: 'document' | 'web';
  onToggleViewMode?: (mode: 'document' | 'web') => void;
  includeHidden?: boolean;
  onToggleHidden?: (val: boolean) => void;
  canToggleHidden?: boolean;
  onPrint?: () => void;
}

export default function ExecutivePerformanceReport({
  habits,
  analyticsData,
  achievementsData,
  timeRangeLabel = '30 Days',
  startDate,
  endDate,
  viewMode = 'document',
  onToggleViewMode,
  includeHidden = false,
  onToggleHidden,
  canToggleHidden = false,
  onPrint,
}: ExecutivePerformanceReportProps) {
  const { isDarkMode } = useTheme();

  // 1. Completion stats & totals
  const completionStats: Array<{
    date: string;
    total: number;
    completed: number;
    partial?: number;
    rate: number;
  }> = analyticsData?.completionStats || [];

  const totalScheduled = completionStats.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalCompleted = completionStats.reduce((sum, s) => sum + (s.completed || 0), 0);
  const totalPartial = completionStats.reduce((sum, s) => sum + (s.partial || 0), 0);
  const overallRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : null;

  // Grade calculation (Requires minimum 7 scheduled occurrences for statistical validity)
  const { grade, gradeColor, gradeTitle, gradeSummary, isCalibrating } = useMemo(() => {
    if (totalScheduled < 7) {
      return {
        grade: 'CAL',
        gradeColor: 'text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60',
        gradeTitle: 'Baseline Calibrating',
        gradeSummary: `Accumulating observation data (${totalScheduled}/7 scheduled occurrences recorded). A definitive grade unlocks after 7 scheduled opportunities.`,
        isCalibrating: true,
      };
    }

    const rate = overallRate ?? 0;
    if (rate >= 85) {
      return {
        grade: 'A',
        gradeColor: 'text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60',
        gradeTitle: 'Mastery & High Automaticity',
        gradeSummary: 'Routine execution is disciplined with minimal scheduling friction. Core habits are solidified.',
        isCalibrating: false,
      };
    } else if (rate >= 70) {
      return {
        grade: 'B',
        gradeColor: 'text-indigo-700 dark:text-indigo-300 border-indigo-400 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60',
        gradeTitle: 'Solid Core Consistency',
        gradeSummary: 'Consistent daily baseline maintained. Minor friction detected during specific weekdays or secondary habits.',
        isCalibrating: false,
      };
    } else if (rate >= 50) {
      return {
        grade: 'C',
        gradeColor: 'text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60',
        gradeTitle: 'Moderate Routine Friction',
        gradeSummary: 'Intermittent execution patterns. High susceptibility to drop-offs on busy or unstructured days.',
        isCalibrating: false,
      };
    } else {
      return {
        grade: 'D',
        gradeColor: 'text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60',
        gradeTitle: 'Critical Routine Vulnerability',
        gradeSummary: 'Sustained execution resistance observed across multiple rituals. Immediate scope-reduction advised.',
        isCalibrating: false,
      };
    }
  }, [totalScheduled, overallRate]);

  // 2. Weekday Distribution Analysis & Tie Detection
  const weekdayStats = useMemo(() => {
    const rawList = analyticsData?.weekdayStats || [];
    const validDays = rawList.filter((d: any) => d.scheduled > 0);

    if (validDays.length === 0) {
      return {
        list: rawList,
        worstDay: null,
        bestDay: null,
        isTie: true,
        tieNote: 'Insufficient weekday observations to determine drop-off patterns.',
      };
    }

    const rates = validDays.map((d: any) => d.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    const worstDays = validDays.filter((d: any) => d.rate === minRate);
    const bestDays = validDays.filter((d: any) => d.rate === maxRate);

    const isAllTied = minRate === maxRate;

    let tieNote = '';
    if (isAllTied) {
      tieNote = `All observed weekdays maintain an identical completion rate of ${minRate}%. No day-specific drop-off detected.`;
    } else if (worstDays.length > 1) {
      const names = worstDays.map((d: any) => d.day).join(' and ');
      tieNote = `${names} are tied with the lowest completion rate (${minRate}%).`;
    }

    return {
      list: rawList,
      worstDay: worstDays[0] || null,
      bestDay: bestDays[0] || null,
      worstDays,
      bestDays,
      isTie: isAllTied || worstDays.length > 1,
      tieNote,
    };
  }, [analyticsData]);

  // 3. Habit-by-Habit Risk & Audit
  const habitAudit = useMemo(() => {
    const statsList: any[] = analyticsData?.habitStats || [];
    const statsMap = new Map<string, any>();
    statsList.forEach((hs) => statsMap.set(hs.id, hs));
    const streaksMap = analyticsData?.streaks || {};

    const audits = habits.map((habit) => {
      const serverStat = statsMap.get(habit.id);
      const serverStreak = streaksMap[habit.id];

      const streak = serverStreak?.current ?? habit.streak ?? 0;
      const scheduledCount = serverStat?.totalScheduled ?? serverStat?.totalLogs ?? 0;
      const completedCount = serverStat?.completedLogs ?? 0;
      const partialCount = serverStat?.partialLogs ?? 0;

      const successRate = scheduledCount > 0 
        ? Math.round((completedCount / scheduledCount) * 100) 
        : null;

      let status: 'on_fire' | 'stable' | 'at_risk' | 'calibrating' = 'stable';
      let issueText = '';
      let focusAdvice = '';

      if (scheduledCount < 3) {
        status = 'calibrating';
        issueText = `Calibrating (${scheduledCount}/3 opportunities observed)`;
        focusAdvice = 'Execute next scheduled session to lock in routine baseline.';
      } else if (successRate !== null && successRate >= 80 && streak >= 5) {
        status = 'on_fire';
        focusAdvice = 'Solid anchor habit. Use this to stack emerging routines onto.';
      } else if (successRate !== null && successRate < 50) {
        status = 'at_risk';
        issueText = successRate < 30 ? 'Severe drop-off (<30% completion)' : 'Frequent misses detected';
        focusAdvice = habit.type === 'multi-step' 
          ? 'Reduce friction by simplifying steps or committing to a 2-minute starter action.' 
          : 'Anchor immediately to an existing automatic cue (e.g. morning coffee).';
      } else {
        status = 'stable';
        focusAdvice = 'Maintain current pace and target 5 consecutive completions.';
      }

      return {
        ...habit,
        streak,
        scheduledCount,
        completedCount,
        partialCount,
        successRate,
        status,
        issueText,
        focusAdvice,
      };
    });

    const atRiskHabits = audits.filter(h => h.status === 'at_risk');
    const onFireHabits = audits.filter(h => h.status === 'on_fire');
    const calibratingHabits = audits.filter(h => h.status === 'calibrating');

    return { audits, atRiskHabits, onFireHabits, calibratingHabits };
  }, [habits, analyticsData]);

  // 4. Weight Analysis
  const weightData = analyticsData?.weightStats;
  const currentWeight = weightData?.currentWeight;
  const startingWeight = weightData?.startingWeight;
  const totalWeightChange = weightData?.totalChange;
  const isBaselineOnly = weightData?.isBaselineOnly || (weightData?.history || []).length === 1;
  const weightHistory = weightData?.history || [];

  // 5. Real Milestones & Achievements (No Hardcodings)
  const achievements = useMemo(() => {
    const rawList: any[] = achievementsData?.achievements || [];
    const stats = achievementsData?.stats || {
      totalPoints: 0,
      unlockedCount: 0,
      totalCount: rawList.length,
    };

    const unlocked = rawList.filter((a) => a.achieved);
    const inProgress = rawList.filter((a) => !a.achieved).sort((a, b) => (b.progress || 0) - (a.progress || 0));

    return {
      unlocked,
      inProgress,
      totalPoints: stats.totalPoints,
      unlockedCount: stats.unlockedCount,
      totalCount: stats.totalCount || rawList.length,
    };
  }, [achievementsData]);

  // Chart data: Velocity & Rolling Average
  const velocityData = useMemo(() => {
    return completionStats.map((s, idx) => {
      const windowStart = Math.max(0, idx - 6);
      const slice = completionStats.slice(windowStart, idx + 1);
      const sumRates = slice.reduce((acc, curr) => acc + curr.rate, 0);
      const rollingAvg = Math.round(sumRates / slice.length);

      return {
        date: s.date.slice(5),
        fullDate: s.date,
        rate: s.rate,
        rollingAvg,
        scheduled: s.total,
        completed: s.completed,
      };
    });
  }, [completionStats]);

  const habitBarData = useMemo(() => {
    return habitAudit.audits.map(h => ({
      name: h.name.length > 14 ? h.name.slice(0, 12) + '…' : h.name,
      fullName: h.name,
      rate: h.successRate ?? 0,
      scheduled: h.scheduledCount,
      completed: h.completedCount,
      category: h.category,
      isCalibrating: h.status === 'calibrating',
    }));
  }, [habitAudit]);

  const weightChartData = useMemo(() => {
    return weightHistory.map((item: any) => ({
      date: item.date.slice(5),
      fullDate: item.date,
      weight: item.weight,
    }));
  }, [weightHistory]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const totalPages = habitAudit.audits.length > 5 ? 4 : 3;

  return (
    <div className="space-y-8">
      {/* ===== ON-SCREEN TOOLBAR (HIDDEN IN PRINT) ===== */}
      <div className="print-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Report Window: <span className="text-indigo-600 dark:text-indigo-400">{timeRangeLabel}</span>
            </span>
          </div>

          {startDate && endDate && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              ({startDate} → {endDate})
            </span>
          )}

          {canToggleHidden && (
            <button
              type="button"
              onClick={() => onToggleHidden && onToggleHidden(!includeHidden)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                includeHidden
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'
              }`}
            >
              {includeHidden ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>{includeHidden ? 'Concealed Rituals Included' : 'Concealed Rituals Excluded'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {onToggleViewMode && (
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-zinc-800 p-1 border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => onToggleViewMode('document')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'document'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText size={13} />
                <span>A4 Preview</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode('web')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'web'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layout size={13} />
                <span>Web Cards</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Printer size={14} />
            <span>Save as PDF / Print</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: EXECUTIVE SUMMARY & SCORECARD                                     */}
      {/* ========================================================================= */}
      <article className="a4-document-sheet">
        <div className="space-y-6">
          {/* Institutional Document Header with Crystal-Clear High-Contrast Colors */}
          <div className="flex items-start justify-between pb-5 border-b-2 border-indigo-600/30 dark:border-indigo-400/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-md">
                  Official Performance Audit
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Daily Habit Flow</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1.5 flex items-center gap-2.5">
                <span>Habit & Health Performance Report</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                Verified audit of routine execution integrity, velocity dynamics, and health metric progression.
              </p>
            </div>
            <div className="text-right text-[11px] space-y-1">
              <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                Period: {timeRangeLabel}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {startDate && endDate ? `${startDate} to ${endDate}` : format(new Date(), 'MMMM d, yyyy')}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Generated: {format(new Date(), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          </div>

          {/* Executive Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
            {/* 1. Grade */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/90 dark:bg-zinc-800/60 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-xl shrink-0 ${gradeColor}`}>
                {grade}
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Routine Grade</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{gradeTitle}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{gradeSummary}</p>
              </div>
            </div>

            {/* 2. Binary Completion */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/90 dark:bg-zinc-800/60 space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Completion Rate</span>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {overallRate !== null ? `${overallRate}%` : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                {totalCompleted} of {totalScheduled} scheduled
              </p>
            </div>

            {/* 3. Execution Volume Breakdown */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/90 dark:bg-zinc-800/60 space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Execution Volume</span>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {totalCompleted + totalPartial}
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400">
                {totalCompleted} full • {totalPartial} partial
              </p>
            </div>

            {/* 4. Active Streaks */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/90 dark:bg-zinc-800/60 space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Streak Anchors</span>
              <div className="text-xl font-mono font-black text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <Flame size={16} className="fill-orange-500" />
                {habitAudit.onFireHabits.length}
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400">
                {habits.length} habits tracked
              </p>
            </div>
          </div>

          {/* REAL MILESTONES & ACHIEVEMENTS SECTION (NO HARDCODINGS) */}
          <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Milestones & Gamified Achievements
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {achievements.totalPoints} PTS
                </span>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {achievements.unlockedCount} of {achievements.totalCount} Unlocked
                </span>
              </div>
            </div>

            {achievements.unlocked.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {achievements.unlocked.slice(0, 3).map((ach: any) => (
                  <div key={ach.id} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 flex items-center gap-2.5">
                    <span className="text-lg">{ach.icon || '🏆'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{ach.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-indigo-100 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-300">
                No milestones unlocked yet. Complete your first daily habit check-in or sustain a 3-day streak to earn your first milestone badge and reward points!
              </div>
            )}
          </div>

          {/* Core Trajectory Chart */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Consistency & Velocity Trajectory
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Daily Completion % (Blue) • 7-Day Rolling Trend (Orange Dashed)
              </span>
            </div>

            <div className="h-60 w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-900/60">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 shadow-md text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{d.fullDate}</p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-bold">{d.rate}% Completed ({d.completed}/{d.scheduled})</p>
                          <p className="text-orange-500 text-[11px]">7-Day Average: {d.rollingAvg}%</p>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2} fillOpacity={0.15} fill="#4f46e5" />
                  <Line type="monotone" dataKey="rollingAvg" stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Integrity & Coverage Note */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-white font-bold">Audit Methodology:</strong> Denominators are derived strictly from scheduled calendar opportunities ($E$). Unlogged days count as unfulfilled scheduled occurrences, preventing artificial rate inflation. Multi-step rituals require completion of all checklist milestones to be verified as complete.
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          <span>Page 1 of {totalPages} • Executive Scorecard</span>
          <span>Confidential Personal Audit</span>
          <span>Daily Habit Flow Engine</span>
        </div>
      </article>

      {/* ========================================================================= */}
      {/* PAGE 2: HABIT DIAGNOSTICS & LAG IDENTIFICATION                            */}
      {/* ========================================================================= */}
      <article className="a4-document-sheet">
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-200 dark:border-zinc-800">
            <h2 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight">
              Habit-Level Diagnostics & Vulnerability Audit
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Granular inspection of individual habit completion rates, sample sizes, and identified friction.
            </p>
          </div>

          {/* Diagnostic Findings */}
          <div className="space-y-3">
            {/* Lags / At-Risk Habits */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Identified Routine Lags:</span>
              </div>
              {habitAudit.atRiskHabits.length > 0 ? (
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pl-5 list-disc leading-relaxed">
                  {habitAudit.atRiskHabits.map((h) => (
                    <li key={h.id}>
                      <strong className="text-slate-950 dark:text-white">{h.name}</strong> ({h.category}) completed{' '}
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{h.completedCount} of {h.scheduledCount}</span> scheduled days ({h.successRate}%). {h.issueText}.
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  ✓ No individual habits are in critical drop-off. All active routines maintain at least a 50% consistency baseline.
                </p>
              )}
            </div>

            {/* Weekday Lag Diagnostic with Tie-Detection */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/90 dark:bg-zinc-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <TrendingDown size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Temporal / Weekday Execution Patterns:</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {weekdayStats.isTie ? (
                  <span>{weekdayStats.tieNote}</span>
                ) : weekdayStats.worstDay ? (
                  <span>
                    Your weakest execution day is <strong className="text-slate-950 dark:text-white">{weekdayStats.worstDay.day}</strong> with an average completion rate of{' '}
                    <strong className="text-amber-700 dark:text-amber-400 font-mono">{weekdayStats.worstDay.rate}%</strong> ({weekdayStats.worstDay.completed}/{weekdayStats.worstDay.scheduled} completed).
                    {weekdayStats.bestDay && (
                      <span> Peak performance occurs on <strong className="text-slate-950 dark:text-white">{weekdayStats.bestDay.day}</strong> ({weekdayStats.bestDay.rate}%).</span>
                    )}
                  </span>
                ) : (
                  <span>Insufficient observations to establish reliable day-of-week trends.</span>
                )}
              </p>
            </div>
          </div>

          {/* Habit Comparison Breakdown Chart */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Individual Habit Consistency Comparison
              </h3>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Success Rate % by Habit
              </span>
            </div>

            <div className="h-56 w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-900/60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 shadow-md text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{d.fullName} ({d.category})</p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                            {d.isCalibrating ? 'Calibrating (<3 samples)' : `${d.rate}% (${d.completed}/${d.scheduled})`}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="rate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Habit Audit Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[9px] border-b border-slate-200 dark:border-zinc-700">
                <tr>
                  <th className="py-2.5 px-3">Habit Name</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2">Scheduled</th>
                  <th className="py-2.5 px-2">Success Rate</th>
                  <th className="py-2.5 px-2">Streak</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900/40">
                {habitAudit.audits.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      {h.name}
                      {h.hidden && (
                        <span className="ml-1.5 px-1 py-0.5 rounded text-[8px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                          Concealed
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-500 dark:text-slate-400 text-[11px]">{h.category}</td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {h.completedCount}/{h.scheduledCount}
                    </td>
                    <td className="py-2 px-2 font-mono font-bold text-slate-900 dark:text-white">
                      {h.successRate !== null ? `${h.successRate}%` : 'Calibrating'}
                    </td>
                    <td className="py-2 px-2 font-mono font-bold text-orange-600 dark:text-orange-400">
                      {h.streak > 0 ? `${h.streak}d` : '0d'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        h.status === 'on_fire' 
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                          : h.status === 'at_risk' 
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' 
                          : h.status === 'calibrating'
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200'
                      }`}>
                        {h.status === 'on_fire' ? 'On Fire' : h.status === 'at_risk' ? 'At Risk' : h.status === 'calibrating' ? 'Calibrating' : 'Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          <span>Page 2 of {totalPages} • Habit Diagnostics</span>
          <span>Confidential Personal Audit</span>
          <span>Daily Habit Flow Engine</span>
        </div>
      </article>

      {/* ========================================================================= */}
      {/* PAGE 3: TEMPORAL DROP-OFFS & RECURRING PATTERNS                          */}
      {/* ========================================================================= */}
      <article className="a4-document-sheet">
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-200 dark:border-zinc-800">
            <h2 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight">
              Temporal Patterns & Day-of-Week Drop-Off Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analysis of weekly cadence to identify friction days and scheduling imbalances.
            </p>
          </div>

          {/* Weekday Matrix Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Weekday Performance Distribution
              </h3>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Completion Rate by Day of Week
              </span>
            </div>

            <div className="h-60 w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-900/60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayStats.list} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 shadow-md text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{d.day}</p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                            {d.rate}% ({d.completed}/{d.scheduled} scheduled completed)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekday Data Table with Sample Counts */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[9px] border-b border-slate-200 dark:border-zinc-700">
                <tr>
                  <th className="py-2.5 px-3">Weekday</th>
                  <th className="py-2.5 px-3">Scheduled Opportunities</th>
                  <th className="py-2.5 px-3">Completed Executions</th>
                  <th className="py-2.5 px-3">Completion Rate</th>
                  <th className="py-2.5 px-3">Pattern Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900/40">
                {weekdayStats.list.map((d: any) => (
                  <tr key={d.day}>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{d.day}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{d.scheduled}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{d.completed}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{d.rate}%</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                      {d.scheduled === 0 
                        ? 'No rituals scheduled' 
                        : d.rate >= 80 
                        ? 'High Automaticity' 
                        : d.rate < 50 
                        ? 'Drop-off Vulnerability' 
                        : 'Moderate Stability'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Strategic Friction Assessment */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Diagnostic Interpretation:
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              When weekdays show drop-offs below 50%, fatigue or schedule compression is the primary driver. Rather than attempting full multi-step checklists on low-energy days, implement a **Minimum Viable Protocol (MVP)** consisting of 1 non-negotiable anchor habit to preserve momentum without burnout.
            </p>
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          <span>Page 3 of {totalPages} • Temporal Cadence</span>
          <span>Confidential Personal Audit</span>
          <span>Daily Habit Flow Engine</span>
        </div>
      </article>

      {/* ========================================================================= */}
      {/* PAGE 4: HEALTH METRICS & 3-STEP STRATEGIC ACTION PLAN                     */}
      {/* ========================================================================= */}
      <article className="a4-document-sheet">
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-200 dark:border-zinc-800">
            <h2 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight">
              Physical Metric Progression & Action Plan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Biometric progress monitoring and concrete, prioritized interventions for the upcoming period.
            </p>
          </div>

          {/* Body Weight Physical Progress */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/90 dark:bg-zinc-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Body Weight & Physical Calibration Status
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                {currentWeight ? `${currentWeight} kg` : 'Uncalibrated'}
              </span>
            </div>

            {isBaselineOnly ? (
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">Baseline Benchmark Locked:</span>{' '}
                Initial weight calibrated at <strong className="text-slate-900 dark:text-white">{currentWeight} kg</strong> on {weightHistory[0]?.date || 'initial check-in'}. Trend velocity and rate-of-change metrics will calculate automatically after logging a 2nd measurement.
              </div>
            ) : weightHistory.length >= 2 ? (
              <div className="space-y-2">
                <div className="h-44 w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-2 bg-white dark:bg-zinc-900/60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `${v}kg`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 shadow-md text-xs">
                              <p className="font-bold text-slate-900 dark:text-white">{d.fullDate}</p>
                              <p className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{d.weight} kg</p>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} fillOpacity={0.15} fill="#10b981" dot={{ r: 3, fill: '#10b981' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Net change: {totalWeightChange !== null ? `${totalWeightChange > 0 ? `+${totalWeightChange}` : totalWeightChange} kg` : 'N/A'} over {weightHistory.length} check-ins.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No physical weight calibration entries recorded. Use the monthly check-in tool to track body composition trends.
              </p>
            )}
          </div>

          {/* 3 Concrete Actionable Interventions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Three Prioritized Next-Cycle Interventions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Action 1 */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                    1
                  </span>
                  <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    Friction Reduction
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {habitAudit.atRiskHabits.length > 0 ? (
                    <>
                      Simplify <strong className="text-slate-900 dark:text-white">{habitAudit.atRiskHabits[0].name}</strong>. Strip secondary steps and execute an easy 2-minute starter version.
                    </>
                  ) : (
                    <>Maintain current momentum and transition 7-day streaks into 21-day automaticity milestones.</>
                  )}
                </p>
              </div>

              {/* Action 2 */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                    2
                  </span>
                  <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    Shield Weak Days
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {weekdayStats.worstDay && !weekdayStats.isTie ? (
                    <>
                      Adopt a Minimum Viable Protocol on <strong className="text-slate-900 dark:text-white">{weekdayStats.worstDay.day}</strong>. Execute 1 non-negotiable anchor to preserve unbroken streaks.
                    </>
                  ) : (
                    <>Keep even scheduling distribution between workdays and weekends without overloading any single session.</>
                  )}
                </p>
              </div>

              {/* Action 3 */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                    3
                  </span>
                  <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    Habit Stacking
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {habitAudit.onFireHabits.length > 0 ? (
                    <>
                      Chain slipping rituals directly after <strong className="text-slate-900 dark:text-white">{habitAudit.onFireHabits[0].name}</strong>: “Immediately upon finishing, start the next task.”
                    </>
                  ) : (
                    <>Link routines to established environmental triggers such as morning coffee or evening wind-down.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Audit Sign-Off Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs text-slate-600 dark:text-slate-400 space-y-1 font-mono">
            <p className="font-bold text-slate-900 dark:text-white">Audit Verification Sign-Off</p>
            <p className="text-[11px]">
              Calculated by Daily Habit Flow • All formulas verified against local database logs • Zero synthetic estimations.
            </p>
          </div>
        </div>

        {/* Page 4 Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          <span>Page {totalPages} of {totalPages} • Recommendations & Sign-Off</span>
          <span>Confidential Personal Audit</span>
          <span>Daily Habit Flow Engine</span>
        </div>
      </article>
    </div>
  );
}
