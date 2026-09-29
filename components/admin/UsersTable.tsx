'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isActive: boolean;
  stats: { habitCount: number; completionRate: string | number; lastActivity: string | null };
}

interface UserPage {
  users: AdminUser[];
  pagination: { page: number; total: number; totalPages: number };
  counts: { all: number; active: number; inactive: number };
}

export function UsersTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isFetching, refetch } = useQuery<UserPage>({
    queryKey: ['admin-users', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ search, page: String(page), limit: '20' });
      const response = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load users');
      return response.json();
    },
  });

  return <section className="space-y-4">
    <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="User totals">
      {[
        ['All users', data?.counts.all],
        ['Active', data?.counts.active],
        ['Inactive', data?.counts.inactive],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4"><p className="text-[11px] font-medium text-slate-500 sm:text-xs">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-950 sm:text-2xl">{typeof value === 'number' ? value.toLocaleString() : '—'}</p></div>)}
    </div>

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <label className="relative block w-full sm:max-w-md"><span className="sr-only">Search users by name or email</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><Input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email…" className="h-11 pl-10"/></label>
      <span className="text-xs text-slate-500" aria-live="polite">{isFetching ? 'Updating…' : data ? `${data.pagination.total.toLocaleString()} users found` : ' '}</span>
    </div>

    {isLoading && <div className="space-y-2" aria-label="Loading users">{[1, 2, 3, 4].map(row => <div key={row} className="h-20 animate-pulse rounded-xl bg-slate-200"/>)}</div>}
    {isError && <div className="rounded-2xl border border-rose-200 bg-white p-5" role="alert"><p className="text-sm font-semibold text-rose-900">Users could not be loaded.</p><button onClick={() => void refetch()} className="mt-3 min-h-11 rounded-lg border border-rose-300 px-4 text-sm font-semibold text-rose-900 hover:bg-rose-50">Try again</button></div>}

    {!isLoading && !isError && data?.users.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Users size={20}/></span><h2 className="mt-3 text-sm font-semibold text-slate-900">{search ? 'No matching users' : 'No users yet'}</h2><p className="mt-1 text-sm text-slate-600">{search ? 'Try a different name or email.' : 'Registered accounts will appear here.'}</p></div>}

    {!isLoading && !isError && data?.users.length ? <>
      <ul className="space-y-2 sm:hidden" aria-label="Users">
        {data.users.map(user => <li key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{user.username !== 'N/A' ? user.username : user.email}</p><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs"><div><p className="text-slate-500">Habits</p><p className="mt-1 font-semibold text-slate-800">{user.stats.habitCount}</p></div><div><p className="text-slate-500">Completion</p><p className="mt-1 font-semibold text-slate-800">{user.stats.completionRate}%</p></div><div><p className="text-slate-500">Joined</p><p className="mt-1 font-semibold text-slate-800">{new Date(user.createdAt).toLocaleDateString()}</p></div></div><Link href={`/admin/users/${user.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-50 px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">View account <ArrowRight size={15} className="ml-2"/></Link></li>)}
      </ul>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3 font-semibold">User</th><th scope="col" className="px-4 py-3 font-semibold">Joined</th><th scope="col" className="px-4 py-3 font-semibold">Habits</th><th scope="col" className="px-4 py-3 font-semibold">Completion</th><th scope="col" className="px-4 py-3 font-semibold">Status</th><th scope="col" className="px-4 py-3"/></tr></thead><tbody className="divide-y divide-slate-100">{data.users.map(user => <tr key={user.id} className="hover:bg-slate-50/70"><td className="max-w-[260px] px-4 py-3"><p className="truncate font-semibold text-slate-900">{user.username !== 'N/A' ? user.username : user.email}</p><p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p></td><td className="px-4 py-3 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-4 py-3 tabular-nums text-slate-700">{user.stats.habitCount}</td><td className="px-4 py-3 tabular-nums text-slate-700">{user.stats.completionRate}%</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 text-right"><Link href={`/admin/users/${user.id}`} className="inline-flex min-h-10 items-center rounded-lg px-3 font-semibold text-indigo-700 hover:bg-indigo-50">View</Link></td></tr>)}</tbody></table></div></div>
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}</p><div className="flex gap-2"><button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1 || isFetching} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"><ArrowLeft size={15}/>Previous</button><button onClick={() => setPage(value => Math.min(data.pagination.totalPages, value + 1))} disabled={page >= data.pagination.totalPages || isFetching} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Next<ArrowRight size={15}/></button></div></div>
    </> : null}
  </section>;
}
