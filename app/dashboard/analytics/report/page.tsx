'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ExecutivePerformanceReport from '@/components/ExecutivePerformanceReport';
import { Habit } from '@/types';
import { format, subDays } from 'date-fns';
import { Loader2, MoveLeft, Calendar, Filter, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useHiddenMode } from '@/context/HiddenModeContext';

type TimeRangeOption = '7D' | '30D' | '365D' | 'custom';

export default function AnalyticsReportPage() {
  const router = useRouter();
  const { isHiddenMode } = useHiddenMode();

  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [achievementsData, setAchievementsData] = useState<any>(null);

  // Range and filter state
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('30D');
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [includeHidden, setIncludeHidden] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'document' | 'web'>('document');

  // When hidden mode is unlocked by the BrandMark secret hold, auto-enable hidden habit inclusion
  useEffect(() => {
    if (isHiddenMode) {
      setIncludeHidden(true);
    }
  }, [isHiddenMode]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let analyticsUrl = '/api/analytics?';
      const params = new URLSearchParams();

      if (timeRange === '7D') {
        params.set('period', 'weekly');
      } else if (timeRange === '30D') {
        params.set('period', 'monthly');
      } else if (timeRange === '365D') {
        params.set('period', 'yearly');
      } else if (timeRange === 'custom') {
        params.set('startDate', customStart);
        params.set('endDate', customEnd);
      }

      if (includeHidden && isHiddenMode) {
        params.set('includeHidden', 'true');
      }

      analyticsUrl += params.toString();

      const [habitsRes, analyticsRes, achievementsRes] = await Promise.all([
        fetch('/api/habits', { cache: 'no-store' }),
        fetch(analyticsUrl, { cache: 'no-store' }),
        fetch('/api/achievements', { cache: 'no-store' }),
      ]);

      if (habitsRes.status === 401 || analyticsRes.status === 401) {
        router.push('/login');
        return;
      }

      if (habitsRes.ok) {
        const habitsJson = await habitsRes.json();
        let list: Habit[] = habitsJson.habits || [];
        if (!includeHidden || !isHiddenMode) {
          list = list.filter((h) => !h.hidden);
        }
        setHabits(list);
      }

      if (analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        setAnalyticsData(analyticsJson);
      }

      if (achievementsRes.ok) {
        const achJson = await achievementsRes.json();
        setAchievementsData(achJson);
      }
    } catch (err) {
      console.error('Failed to load performance report data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, customStart, customEnd, includeHidden, isHiddenMode, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const timeRangeLabel = 
    timeRange === '7D' ? 'Last 7 Days (1 Week)' :
    timeRange === '30D' ? 'Last 30 Days (1 Month)' :
    timeRange === '365D' ? 'Last 365 Days (1 Year)' :
    `Custom Range (${customStart} to ${customEnd})`;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header & Range Controller */}
      <div className="print-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition group"
          >
            <MoveLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Analytics Dashboard</span>
          </Link>

          {/* Hidden Rituals Indicator */}
          {isHiddenMode && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <span>🕵️ Concealed Rituals Active (BrandMark Benchmark)</span>
              <button
                type="button"
                onClick={() => setIncludeHidden(!includeHidden)}
                className="underline hover:text-amber-800 dark:hover:text-amber-200"
              >
                {includeHidden ? 'Exclude from Audit' : 'Include in Audit'}
              </button>
            </div>
          )}
        </div>

        {/* Range Selector Bar */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#12141D] p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
              Audit Window:
            </span>

            {(['7D', '30D', '365D', 'custom'] as const).map((range) => {
              const labels: Record<TimeRangeOption, string> = {
                '7D': '1 Week',
                '30D': '1 Month',
                '365D': '1 Year',
                custom: 'Custom Range',
              };
              const isSelected = timeRange === range;

              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {labels[range]}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-zinc-800">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span>Start:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </label>

              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span>End:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </label>

              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
              >
                <RefreshCw size={12} />
                <span>Apply</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="w-full max-w-5xl mx-auto py-24 text-center space-y-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-sm font-semibold">Generating Executive Diagnostic Audit…</p>
          <p className="text-xs text-slate-400">Verifying daily schedule logs and calibrating metrics…</p>
        </div>
      ) : (
        <ExecutivePerformanceReport
          habits={habits}
          analyticsData={analyticsData}
          achievementsData={achievementsData}
          timeRangeLabel={timeRangeLabel}
          startDate={analyticsData?.startDate || customStart}
          endDate={analyticsData?.endDate || customEnd}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          includeHidden={includeHidden}
          onToggleHidden={setIncludeHidden}
          canToggleHidden={isHiddenMode}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}
