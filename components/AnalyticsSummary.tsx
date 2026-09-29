'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Check, Lightbulb } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Habit, DailyLog } from '@/types';
import { getCompletedHabitIdsByDate } from '@/lib/utils';

interface Props { habits: Habit[]; logs: DailyLog[]; startDate: string; endDate: string; period: 'week' | 'month'; }

export default function AnalyticsSummary({ habits, logs, startDate, endDate, period }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { trend, rows } = useMemo(() => {
    const completed = getCompletedHabitIdsByDate(habits, logs);
    const days: string[] = [];
    for (let date = new Date(`${startDate}T12:00:00`); format(date, 'yyyy-MM-dd') <= endDate; date = addDays(date, 1)) days.push(format(date, 'yyyy-MM-dd'));
    const active = habits.filter(habit => habit.active !== false);
    const scheduled = (habit: Habit, date: string) => {
      const day = new Date(`${date}T12:00:00`).getDay();
      const schedule = habit.schedule || {};
      return schedule.custom?.length ? schedule.custom.includes(day) : day === 0 || day === 6 ? schedule.weekends !== false : schedule.weekdays !== false;
    };
    const habitRows = active.map(habit => {
      let due = 0; let done = 0;
      days.forEach(date => { if (!scheduled(habit, date)) return; due++; if (completed.get(date)?.has(habit.id)) done++; });
      return { habit, due, done, rate: due ? Math.round(done / due * 100) : 0 };
    }).filter(row => row.due > 0);
    const chart = days.map(date => {
      const dueHabits = active.filter(habit => scheduled(habit, date));
      const count = dueHabits.reduce((total, habit) => total + Number(Boolean(completed.get(date)?.has(habit.id))), 0);
      return { label: format(new Date(`${date}T12:00:00`), period === 'week' ? 'EEE' : 'd'), rate: dueHabits.length ? Math.round(count / dueHabits.length * 100) : 0, count, date };
    });
    return { trend: chart, rows: habitRows.sort((a, b) => b.rate - a.rate || b.done - a.done) };
  }, [habits, logs, startDate, endDate, period]);
  const leader = rows[0];
  const growth = rows.length > 1 ? rows[rows.length - 1] : undefined;

  return <div className="space-y-5">
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,.8fr)]">
      <div className="report-chart rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Daily follow-through</h2><p className="mt-1 text-sm text-slate-500">Share of scheduled habits completed each day</p></div><span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{period === 'week' ? '7 days' : 'This month'}</span></div>
        <div className="h-64 min-w-0" role="img" aria-label="Daily habit completion rate chart">
          {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 360, height: 240 }}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs><linearGradient id="habitReportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2}/><stop offset="100%" stopColor="#4f46e5" stopOpacity={0.01}/></linearGradient></defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#e8edf4"/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval={period === 'month' ? 'preserveStartEnd' : 0}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} tickFormatter={value => `${value}%`} width={48}/>
              <Tooltip formatter={(value) => [`${value}%`, 'Completed']} labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px #0f172a12' }}/>
              <Area type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2.5} fill="url(#habitReportFill)" connectNulls={false} activeDot={{ r: 5, strokeWidth: 0 }}/>
            </AreaChart>
          </ResponsiveContainer> : <div className="h-full animate-pulse rounded-xl bg-slate-50 dark:bg-slate-800/50"/>}
        </div>
        <p className="mt-1 text-xs text-slate-400">Zeroes represent days with scheduled habits and no recorded completions.</p>
      </div>

      <aside className="flex flex-col gap-3">
        <Insight icon={<ArrowUpRight size={18}/>} tone="green" title="Your strongest rhythm" text={leader ? `${leader.habit.name} is your most consistent habit, at ${leader.rate}% (${leader.done} of ${leader.due} scheduled check-ins).` : 'Your strongest habit will appear once a habit is scheduled in this period.'}/>
        <Insight icon={<ArrowDownRight size={18}/>} tone="amber" title="A gentle opportunity" text={growth ? `${growth.habit.name} has ${growth.due - growth.done} open check-in${growth.due - growth.done === 1 ? '' : 's'}. Try making the next step smaller or pairing it with an existing routine.` : 'Start with one small check-in. Repeating a manageable action is a useful next step.'}/>
      </aside>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><Check size={17} className="text-indigo-600"/><h2 className="font-extrabold text-slate-900 dark:text-white">Habit-by-habit</h2><span className="ml-auto text-xs font-medium text-slate-500">{rows.length} scheduled</span></div>
      {rows.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map(({ habit, due, done, rate }) => <div key={habit.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:grid-cols-[minmax(160px,1fr)_minmax(100px,1.7fr)_auto]">
        <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{habit.name}</span>
        <div className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:col-span-1"><div className={`h-full rounded-full ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${rate}%` }}/></div>
        <span className="text-right text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">{done}/{due} · {rate}%</span>
      </div>)}</div> : <div className="px-5 py-8 text-center text-sm text-slate-500">No habits were scheduled for this period.</div>}
    </section>
    <div className="flex items-start gap-3 rounded-xl bg-indigo-50/70 p-4 text-sm text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-100"><Lightbulb className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" size={17}/><p><strong>Keep the next step easy.</strong> Pick one open check-in and decide when you’ll do it. A specific cue makes it easier to return tomorrow.</p></div>
  </div>;
}

function Insight({ icon, tone, title, text }: { icon: React.ReactNode; tone: 'green' | 'amber'; title: string; text: string }) {
  return <div className={`flex-1 rounded-2xl border p-5 ${tone === 'green' ? 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20' : 'border-amber-100 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20'}`}><div className={`flex items-center gap-2 text-sm font-extrabold ${tone === 'green' ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'}`}><span>{icon}</span>{title}</div><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p></div>;
}
