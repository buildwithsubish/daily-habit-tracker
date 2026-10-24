'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, RefreshCw, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  recentUsers: number;
  totalLogs: number;
  completedLogs: number;
  completionRate: number;
  dailyActivity: Array<{ date: string; total: number; completed: number }>;
  habitsByCategory: Array<{ category: string; count: number }>;
}

export default function AdminAnalyticsPage() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery<AdminAnalytics>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load admin analytics');
      return response.json();
    },
  });

  if (isLoading) return <main className="space-y-5" aria-label="Loading admin analytics"><div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"/><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"/>)}</div><div className="grid gap-4 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"/><div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"/></div></main>;

  if (isError || !data) return <main className="mx-auto max-w-2xl rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-6 sm:p-8" role="alert"><h1 className="text-xl font-bold text-slate-950 dark:text-white">Analytics couldn’t load</h1><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Check your connection or admin session, then try again.</p><button onClick={() => void refetch()} disabled={isFetching} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-md shadow-indigo-600/20"><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/>{isFetching ? 'Retrying…' : 'Try again'}</button></main>;

  const activity = (data.dailyActivity || []).map(day => ({
    date: new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    completed: day.completed,
    entries: day.total,
  }));
  const categories = data.habitsByCategory || [];
  const metrics = [
    { label: 'Enabled accounts', value: data.activeUsers, icon: Users, description: `of ${data.totalUsers.toLocaleString()} total accounts`, tone: 'indigo' },
    { label: 'New accounts', value: data.recentUsers, icon: Activity, description: 'Created in the last 7 days', tone: 'teal' },
    { label: 'Completion rate', value: `${Math.round(data.completionRate)}%`, icon: CheckCircle2, description: `${data.completedLogs.toLocaleString()} of ${data.totalLogs.toLocaleString()} records completed`, tone: 'amber' },
  ] as const;

  return <main className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-400">Administration</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Platform analytics</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Historical account and habit activity from saved records.</p></div><button onClick={() => void refetch()} disabled={isFetching} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-60 sm:w-auto transition-colors"><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/>{isFetching ? 'Updating…' : 'Refresh data'}</button></header>

    <section aria-label="Platform metrics" className="grid gap-3 sm:grid-cols-3">{metrics.map(({ label, value, icon: Icon, description, tone }) => <article key={label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400' : tone === 'teal' ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400'}`}><Icon size={19}/></span></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{description}</p></article>)}</section>

    <section className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card className="min-w-0"><CardHeader><CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Daily habit records</CardTitle><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Completed logs and total log entries over the last 30 days</p></CardHeader><CardContent>{activity.length ? <div className="h-64 min-w-0 sm:h-72" role="img" aria-label="Historical daily completed habit logs and total entries"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><AreaChart data={activity} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}><defs><linearGradient id="adminAnalyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2}/><stop offset="100%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#334155" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={22}/><YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={36}/><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: 12 }}/><Area type="monotone" dataKey="entries" name="Log entries" stroke="#64748b" strokeWidth={1.5} fill="transparent"/><Area type="monotone" dataKey="completed" name="Completed logs" stroke="#6366f1" strokeWidth={2.5} fill="url(#adminAnalyticsFill)"/></AreaChart></ResponsiveContainer></div> : <EmptyState title="No daily activity yet" detail="Habit records will be charted after users begin logging."/>}</CardContent></Card>

      <Card className="min-w-0"><CardHeader><CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Saved habits by category</CardTitle><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Number of habits in each category</p></CardHeader><CardContent>{categories.length ? <div className="h-64 min-w-0 sm:h-72" role="img" aria-label="Saved habits grouped by category"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><BarChart data={categories} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}><CartesianGrid stroke="#334155" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={52}/><YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={36}/><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: 12 }}/><Bar dataKey="count" name="Habits" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={44}/></BarChart></ResponsiveContainer></div> : <EmptyState title="No habits to group" detail="Category totals will appear when habits are created."/>}</CardContent></Card>
    </section>
  </main>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 px-5 text-center"><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p></div>;
}
