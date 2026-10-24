'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, ShieldCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Overview & Stats',
  '/admin/users': 'User Directory',
  '/admin/presets': 'Protocols & Presets',
  '/admin/analytics': 'System Analytics',
  '/admin/team': 'Team & Access Control',
  '/admin/settings': 'Security & Settings',
};

export function AdminNavbar() {
  const pathname = usePathname();
  let title = pageTitles[pathname];
  if (!title) {
    if (pathname.startsWith('/admin/users/')) {
      title = 'User Profile & Audit';
    } else {
      title = 'Administration';
    }
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pl-[4.5rem] sm:px-6 sm:pl-20 lg:px-8 transition-colors">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-indigo-600 dark:text-indigo-400">Daily Habit Flow Admin</p>
        <p className="truncate text-base font-extrabold text-slate-950 dark:text-white sm:text-lg">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="hidden items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/40 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 sm:inline-flex">
          <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
          Admin Workspace
        </span>

        <ThemeToggle />

        <Link
          href="/admin/settings"
          aria-label="Open admin settings"
          aria-current={pathname === '/admin/settings' ? 'page' : undefined}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
            pathname === '/admin/settings'
              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-400'
          }`}
        >
          <Settings size={18} />
        </Link>
      </div>
    </header>
  );
}

