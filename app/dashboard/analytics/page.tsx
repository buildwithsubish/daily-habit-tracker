'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, Download, FileText, Sparkles } from 'lucide-react';
import { addDays, format, startOfMonth, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Habit, DailyLog } from '@/types';
import { useHiddenMode } from '@/context/HiddenModeContext';
import { getCompletedHabitIdsByDate } from '@/lib/utils';
import AnalyticsSummary from '@/components/AnalyticsSummary';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';

type Period = 'week' | 'month';

function dateKey(date: Date) { return format(date, 'yyyy-MM-dd'); }

export default function AnalyticsPage() {
  const router = useRouter();
  const { isHiddenMode } = useHiddenMode();
  const [period, setPeriod] = useState<Period>('week');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'details'>('overview');

  const today = useMemo(() => new Date(), []);
  const endDate = dateKey(today);
  const startDate = dateKey(period === 'week' ? subDays(today, 6) : startOfMonth(today));
  const dateRange = useMemo(() => {
    const days: string[] = [];
    for (let cursor = new Date(`${startDate}T12:00:00`); dateKey(cursor) <= endDate; cursor = addDays(cursor, 1)) days.push(dateKey(cursor));
    return days;
  }, [startDate, endDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ startDate, endDate });
      const [habitsResponse, logsResponse] = await Promise.all([fetch('/api/habits'), fetch(`/api/logs?${query}`)]);
      if (!habitsResponse.ok || !logsResponse.ok) throw new Error('Your analytics could not be loaded. Please try again.');
      const [habitsData, logsData] = await Promise.all([habitsResponse.json(), logsResponse.json()]);
      setHabits((habitsData.habits || []).filter((habit: Habit) => !habit.hidden || isHiddenMode));
      setLogs(logsData.logs || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your analytics could not be loaded.');
      toast.error('Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, isHiddenMode]);

  useEffect(() => { void load(); }, [load]);

  const report = useMemo(() => {
    const activeHabits = habits.filter(habit => habit.active !== false);
    const completedByDate = getCompletedHabitIdsByDate(activeHabits, logs);
    const rows = activeHabits.map(habit => {
      let scheduled = 0;
      let done = 0;
      dateRange.forEach(day => {
        const weekday = new Date(`${day}T12:00:00`).getDay();
        const schedule = habit.schedule || {};
        const shouldDo = schedule.custom?.length
          ? schedule.custom.includes(weekday)
          : weekday === 0 || weekday === 6 ? schedule.weekends !== false : schedule.weekdays !== false;
        if (!shouldDo) return;
        scheduled += 1;
        if (completedByDate.get(day)?.has(habit.id)) done += 1;
      });
      return { habit, scheduled, done, rate: scheduled ? Math.round(done / scheduled * 100) : 0 };
    }).filter(row => row.scheduled > 0);
    const scheduledTotal = rows.reduce((sum, row) => sum + row.scheduled, 0);
    const completedTotal = rows.reduce((sum, row) => sum + row.done, 0);
    const activeDays = dateRange.filter(day => (completedByDate.get(day)?.size || 0) > 0).length;
    const sorted = [...rows].sort((a, b) => b.rate - a.rate || b.done - a.done);
    const strongest = sorted[0];
    const opportunity = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;
    const trend = dateRange.map(day => {
      const due = rows.reduce((sum, row) => {
        const weekday = new Date(`${day}T12:00:00`).getDay();
        const schedule = row.habit.schedule || {};
        const active = schedule.custom?.length ? schedule.custom.includes(weekday) : weekday === 0 || weekday === 6 ? schedule.weekends !== false : schedule.weekdays !== false;
        return sum + Number(active);
      }, 0);
      const done = rows.reduce((sum, row) => sum + Number(Boolean(completedByDate.get(day)?.has(row.habit.id))), 0);
      return { date: day, label: format(new Date(`${day}T12:00:00`), period === 'week' ? 'EEE' : 'd'), rate: due ? Math.round(done / due * 100) : 0, completed: done, scheduled: due };
    });
    return { rows, scheduledTotal, completedTotal, rate: scheduledTotal ? Math.round(completedTotal / scheduledTotal * 100) : 0, activeDays, strongest, opportunity, trend };
  }, [habits, logs, dateRange, period]);

  const printReport = () => {
    if (!report.rows.length) { toast('Add a habit to create a report.'); return; }
    window.print();
  };

  const label = period === 'week' ? 'Weekly' : 'Monthly';
  return (
    <main className="analytics-page mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <style>{`@media print { @page { size: A4; margin: 16mm; } body { background: white !important; } body * { visibility: hidden !important; } .analytics-report, .analytics-report * { visibility: visible !important; color: #172033 !important; } .analytics-report { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 0 !important; background: white !important; box-shadow: none !important; border: 0 !important; } .analytics-report section, .analytics-report aside, .analytics-report .bg-slate-50, .analytics-report .bg-indigo-50\\/70, .analytics-report .bg-emerald-50\\/70, .analytics-report .bg-amber-50\\/70 { background: white !important; border-color: #dbe3ec !important; box-shadow: none !important; } .analytics-report svg { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } .report-chart { break-inside: avoid; } }`}</style>
      <header className="no-print mb-8 flex flex-col gap-6 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><ChevronLeft size={17} /> Dashboard</button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-indigo-600"><Sparkles size={15} /> Your rhythm, in focus</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Habit report</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">A clear look at what’s working and where a small adjustment can help.</p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label="Report period">
            {(['week', 'month'] as const).map(value => <button key={value} onClick={() => setPeriod(value)} aria-pressed={period === value} className={`min-h-10 rounded-lg px-4 text-sm font-bold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${period === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{value}</button>)}
          </div>
          <button onClick={printReport} disabled={loading || !report.rows.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"><Download size={16} /> Save {label} PDF</button>
        </div>
      </header>

      {loading ? <div className="space-y-5" aria-label="Loading report"><div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"/><div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"/></div> : error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><h2 className="font-bold">We couldn’t load your report</h2><p className="mt-1 text-sm">{error}</p><button onClick={() => void load()} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold shadow-sm dark:bg-slate-900">Try again</button></section> : !report.rows.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><CalendarDays className="mx-auto text-indigo-500" size={30}/><h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Your first report starts with a habit</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Once you add a habit and log a few days, this space will show your real progress.</p></section> : (
        <div className="analytics-report space-y-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-indigo-600"><FileText size={15}/>{label} consistency snapshot</div><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{format(new Date(`${startDate}T12:00:00`), 'MMM d')} – {format(new Date(`${endDate}T12:00:00`), 'MMM d, yyyy')}</h2><p className="mt-1 text-sm text-slate-500">Based on {report.scheduledTotal} scheduled habit-days across {report.rows.length} {report.rows.length === 1 ? 'habit' : 'habits'}.</p></div>
              <div className="flex items-end gap-3"><span className="text-5xl font-black tracking-tight text-indigo-600">{report.rate}%</span><span className="pb-1 text-sm font-semibold text-slate-500">completed</span></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-3">
              <Metric label="Completed" value={`${report.completedTotal} / ${report.scheduledTotal}`} detail="scheduled check-ins" />
              <Metric label="Days in rhythm" value={`${report.activeDays} / ${dateRange.length}`} detail="days with progress" />
              <Metric label="Habits in view" value={`${report.rows.length}`} detail="scheduled this period" />
            </div>
          </section>

          <AnalyticsSummary habits={habits} logs={logs} startDate={startDate} endDate={endDate} period={period} />
          <div className="no-print">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-slate-900 dark:text-white">More detail</h2><p className="text-sm text-slate-500">Explore measurable habits and activity data.</p></div><button onClick={() => setTab(tab === 'details' ? 'overview' : 'details')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-200">{tab === 'details' ? 'Hide details' : 'Show details'}</button></div>
            {tab === 'details' && <AdvancedAnalytics habits={habits} logs={logs} startDate={startDate} endDate={endDate} />}
          </div>
          <footer className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800">This report summarizes habit check-ins recorded in the selected period. It describes logged behavior and does not infer health outcomes.</footer>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 sm:bg-transparent sm:p-0 sm:dark:bg-transparent"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{value}</p><p className="text-xs text-slate-500">{detail}</p></div>;
}
