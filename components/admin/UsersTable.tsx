'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Search, Users, Download, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isActive: boolean;
  isRateLimited?: boolean;
  lockRemainingMinutes?: number;
  stats: { habitCount: number; completionRate: string | number; lastActivity: string | null };
}

interface UserPage {
  users: AdminUser[];
  pagination: { page: number; total: number; totalPages: number };
  counts: { all: number; active: number; inactive: number; rateLimited?: number };
}

export function UsersTable() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'rate_limited'>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isFetching, refetch } = useQuery<UserPage>({
    queryKey: ['admin-users', search, status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ search, page: String(page), limit: '20', status });
      const response = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load users');
      return response.json();
    },
  });

  const exportUsersCSV = () => {
    if (!data?.users?.length) return;
    const headers = ['User ID', 'Email', 'Username', 'Joined Date', 'Habit Count', 'Completion Rate', 'Status'];
    const rows = data.users.map((u) => [
      u.id,
      u.email,
      u.username || '',
      new Date(u.createdAt).toISOString(),
      u.stats.habitCount,
      `${u.stats.completionRate}%`,
      !u.isActive ? 'Suspended' : u.isRateLimited ? `Rate-Limited (${u.lockRemainingMinutes}m)` : 'Active',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return <section className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" aria-label="User totals">
      {[
        ['All users', data?.counts.all],
        ['Active', data?.counts.active],
        ['Suspended', data?.counts.inactive],
        ['Rate-Limited', data?.counts.rateLimited ?? 0],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:rounded-2xl sm:p-4"><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white sm:text-2xl">{typeof value === 'number' ? value.toLocaleString() : '—'}</p></div>)}
    </div>

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <label className="relative block w-full sm:max-w-md">
          <span className="sr-only">Search users by name or email</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email…"
            className="h-11 pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as any);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Suspended only</option>
          <option value="rate_limited">Rate-limited / Locked</option>
        </select>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          {isFetching ? 'Updating…' : data ? `${data.pagination.total.toLocaleString()} users found` : ' '}
        </span>
        <button
          type="button"
          onClick={exportUsersCSV}
          disabled={!data?.users?.length}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
    </div>

    {isLoading && <div className="space-y-2" aria-label="Loading users">{[1, 2, 3, 4].map(row => <div key={row} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"/>)}</div>}
    {isError && <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-5" role="alert"><p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Users could not be loaded.</p><button onClick={() => void refetch()} className="mt-3 min-h-11 rounded-lg border border-rose-300 dark:border-rose-800 px-4 text-sm font-semibold text-rose-900 dark:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40">Try again</button></div>}

    {!isLoading && !isError && data?.users.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-12 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400"><Users size={20}/></span><h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{search ? 'No matching users' : 'No users yet'}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{search ? 'Try a different name or email.' : 'Registered accounts will appear here.'}</p></div>}

    {!isLoading && !isError && data?.users.length ? <>
      <ul className="space-y-2 sm:hidden" aria-label="Users">
        {data.users.map(user => <li key={user.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.username !== 'N/A' ? user.username : user.email}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p></div>{!user.isActive ? <span className="shrink-0 rounded-full bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">Suspended</span> : user.isRateLimited ? <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">🔒 Rate-Limited ({user.lockRemainingMinutes || 0}m)</span> : <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Active</span>}</div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs"><div><p className="text-slate-500 dark:text-slate-400">Habits</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{user.stats.habitCount}</p></div><div><p className="text-slate-500 dark:text-slate-400">Completion</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{user.stats.completionRate}%</p></div><div><p className="text-slate-500 dark:text-slate-400">Joined</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{new Date(user.createdAt).toLocaleDateString()}</p></div></div><Link href={`/admin/users/${user.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 px-3 text-sm font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">View account <ArrowRight size={15} className="ml-2"/></Link></li>)}
      </ul>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sm:block"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400"><tr><th scope="col" className="px-4 py-3 font-semibold">User</th><th scope="col" className="px-4 py-3 font-semibold">Joined</th><th scope="col" className="px-4 py-3 font-semibold">Habits</th><th scope="col" className="px-4 py-3 font-semibold">Completion</th><th scope="col" className="px-4 py-3 font-semibold">Status</th><th scope="col" className="px-4 py-3"/></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.users.map(user => <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"><td className="max-w-[260px] px-4 py-3"><p className="truncate font-semibold text-slate-900 dark:text-white">{user.username !== 'N/A' ? user.username : user.email}</p><p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p></td><td className="px-4 py-3 text-slate-600 dark:text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">{user.stats.habitCount}</td><td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">{user.stats.completionRate}%</td><td className="px-4 py-3">{!user.isActive ? <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">Suspended</span> : user.isRateLimited ? <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">🔒 Rate-Limited ({user.lockRemainingMinutes || 0}m)</span> : <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Active</span>}</td><td className="px-4 py-3 text-right"><Link href={`/admin/users/${user.id}`} className="inline-flex min-h-10 items-center rounded-lg px-3 font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">View</Link></td></tr>)}</tbody></table></div></div>
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500 dark:text-slate-400">Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}</p><div className="flex gap-2"><button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1 || isFetching} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><ArrowLeft size={15}/>Previous</button><button onClick={() => setPage(value => Math.min(data.pagination.totalPages, value + 1))} disabled={page >= data.pagination.totalPages || isFetching} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">Next<ArrowRight size={15}/></button></div></div>
    </> : null}
  </section>;
}
