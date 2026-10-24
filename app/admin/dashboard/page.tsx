'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users, Target, CheckCircle2, Activity, RefreshCw, ArrowRight, ShieldCheck, ShieldAlert, Key, Lock, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SetupChecklist } from '@/components/admin/SetupChecklist';

interface AdminStats {
  totalUsers: number;
  activeUsers?: number;
  totalHabits: number;
  totalLogs: number;
  completedLogs: number;
  completionRate: number;
  recentUsers: number;
  activeAdminSessions?: number;
  recentFailedLogins?: number;
  apiErrorRate?: number;
  systemHealth?: {
    status: 'healthy' | 'warning' | 'critical';
    activeSessions: number;
    failedLoginAlerts24h: number;
    errorRatePercent: number;
    uptimeSeconds: number;
  };
  habitsByCategory: Array<{ category: string; count: number }>;
  topHabits: Array<{ name: string; category: string; completions: number }>;
  dailyActivity: Array<{ date: string; total: number; completed: number }>;
  auditLogs: Array<{ action: string; category: string; createdAt: string; details?: string }>;
}

const COLORS = ['#4f46e5', '#0f766e', '#d97706', '#be123c', '#475569', '#7c3aed'];

export default function AdminDashboard() {
  const { data: stats, isLoading, isError, refetch, isFetching } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load dashboard data');
      return response.json();
    },
  });

  if (isLoading) return <main className="mx-auto max-w-7xl space-y-6" aria-label="Loading admin dashboard">
    <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>
    <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
  </main>;

  if (isError || !stats) return <main className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 sm:p-8" role="alert">
    <h1 className="text-xl font-bold text-slate-950">Dashboard data could not be loaded</h1>
    <p className="mt-2 text-sm text-slate-600">Check your connection and try again. Your admin session may also have expired.</p>
    <button onClick={() => void refetch()} disabled={isFetching} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/>{isFetching ? 'Retrying…' : 'Try again'}</button>
  </main>;

  const chartData = (stats.dailyActivity || []).map(day => ({
    date: new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    completed: day.completed,
  }));

  const metrics = [
    { label: 'Registered users', value: stats.totalUsers, detail: `${stats.recentUsers} joined in the last 7 days`, icon: Users, tone: 'indigo' },
    { label: 'Active users', value: stats.activeUsers, detail: 'Accounts currently enabled', icon: Activity, tone: 'teal' },
    { label: 'Habits created', value: stats.totalHabits, detail: 'Across all accounts', icon: Target, tone: 'amber' },
    { label: 'Completed records', value: stats.completedLogs, detail: `${stats.totalLogs.toLocaleString()} entries · ${Math.round(stats.completionRate)}% completion`, icon: CheckCircle2, tone: 'slate' },
  ] as const;

  return <main className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
    <SetupChecklist />
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-700">Administration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Platform overview</h1><p className="mt-2 text-sm text-slate-600">A summary of recorded platform activity and system health.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/team" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:border-slate-300">
          <Key size={14} /> Team & RBAC
        </Link>
        <Link href="/admin/settings?tab=security" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:border-slate-300">
          <Lock size={14} /> Sessions & 2FA
        </Link>
        <button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-800 disabled:opacity-60"><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/>{isFetching ? 'Updating…' : 'Refresh'}</button>
      </div>
    </header>

    {/* System Health & Security Metrics Module */}
    <section aria-label="System Health and Security Metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Security Health</p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${stats.recentFailedLogins && stats.recentFailedLogins > 10 ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {stats.recentFailedLogins && stats.recentFailedLogins > 10 ? 'Elevated Alerts' : 'Nominal / Secure'}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight">Zero-Trust</p>
          <span className="text-xs text-slate-400">Active</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">Rate-limiting & session guards enforced</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Admin Sessions</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Lock size={15} />
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{stats.activeAdminSessions ?? 1}</p>
        <p className="mt-1 text-xs text-slate-500">Live authenticated server sessions</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Failed Logins (24h)</p>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stats.recentFailedLogins ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
            <ShieldAlert size={15} />
          </span>
        </div>
        <p className={`mt-3 text-3xl font-bold tabular-nums ${stats.recentFailedLogins ? 'text-rose-600' : 'text-slate-900'}`}>{stats.recentFailedLogins ?? 0}</p>
        <p className="mt-1 text-xs text-slate-500">Brute-force attempts detected & blocked</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">API Error Rate</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Server size={15} />
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{stats.apiErrorRate ?? 0}%</p>
        <p className="mt-1 text-xs text-slate-500">Audit failure index across mutations</p>
      </div>
    </section>

    <section aria-label="Platform totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-950">{typeof value === 'number' ? value.toLocaleString() : '—'}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === 'indigo' ? 'bg-indigo-50 text-indigo-700' : tone === 'teal' ? 'bg-teal-50 text-teal-800' : tone === 'amber' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}><Icon size={19}/></span></div>
        <p className="mt-3 text-xs text-slate-500">{detail}</p>
      </article>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
      <Card className="min-w-0">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-base font-semibold text-slate-950">Daily completions</CardTitle><p className="mt-1 text-xs text-slate-500">Recorded habit completions over the last 30 days</p></div><Activity className="hidden text-slate-400 sm:block" size={19}/></CardHeader>
        <CardContent>
          {chartData.length ? <div className="h-64 min-w-0 sm:h-72" role="img" aria-label="Chart of daily habit completions over the last 30 days"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}><defs><linearGradient id="adminCompletedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18}/><stop offset="100%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={22}/><YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={36}/><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}/><Area type="monotone" dataKey="completed" name="Completions" stroke="#4338ca" strokeWidth={2.5} fill="url(#adminCompletedFill)"/></AreaChart>
          </ResponsiveContainer></div> : <EmptyState title="No activity recorded yet" detail="Daily completion history will appear here once users start logging habits."/>}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader><CardTitle className="text-base font-semibold text-slate-950">Habits by category</CardTitle><p className="mt-1 text-xs text-slate-500">Current distribution from saved habits</p></CardHeader>
        <CardContent>{stats.habitsByCategory.length ? <div className="space-y-4">{stats.habitsByCategory.map((category, index) => {
          const total = stats.habitsByCategory.reduce((sum, row) => sum + row.count, 0);
          const percent = total ? Math.round(category.count / total * 100) : 0;
          return <div key={category.category}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-700">{category.category || 'Uncategorized'}</span><span className="shrink-0 tabular-nums text-slate-500">{category.count} <span className="text-xs">({percent}%)</span></span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: COLORS[index % COLORS.length] }}/></div>
          </div>;
        })}</div> : <EmptyState title="No habits yet" detail="Category totals will show after habits are created."/>}</CardContent>
      </Card>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
      <Card className="min-w-0"><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="text-base font-semibold text-slate-950">Most completed habits</CardTitle><p className="mt-1 text-xs text-slate-500">Ranked by completed records</p></div><Link href="/admin/analytics" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Analytics <ArrowRight size={15}/></Link></CardHeader>
        <CardContent>{stats.topHabits.length ? <ul className="divide-y divide-slate-100">{stats.topHabits.map((habit, index) => <li key={`${habit.name}-${index}`} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{habit.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{habit.category}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">{habit.completions.toLocaleString()}</span></li>)}</ul> : <EmptyState title="No completed habits yet" detail="Completed habit records will be ranked here."/>}</CardContent>
      </Card>
      <Card className="min-w-0"><CardHeader><CardTitle className="text-base font-semibold text-slate-950">Recent admin activity</CardTitle></CardHeader><CardContent>{(stats.auditLogs || []).length ? <ul className="space-y-4">{stats.auditLogs.slice(0, 6).map((log, index) => { const category = String(log.category || ''); return <li key={`${log.createdAt}-${index}`} className="flex min-w-0 gap-3"><span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${category === 'security' || category.includes('auth') ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}><ShieldCheck size={16}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{log.action}</p><p className="mt-1 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p></div></li>; })}</ul> : <EmptyState title="No recent audit entries" detail="Security and admin actions will appear here when recorded."/>}</CardContent></Card>
    </section>
  </main>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{detail}</p></div>;
}
