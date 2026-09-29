'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, ShieldCheck } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Overview',
  '/admin/users': 'Users',
  '/admin/presets': 'Presets',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
};

export function AdminNavbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Administration';

  return <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 pl-[4.5rem] sm:px-6 sm:pl-20 lg:px-8">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Daily Habit Tracker</p>
      <p className="truncate text-base font-semibold text-slate-950 sm:text-lg">{title}</p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 sm:inline-flex"><ShieldCheck size={15} className="text-teal-700"/>Admin workspace</span>
      <Link href="/admin/settings" aria-label="Open admin settings" aria-current={pathname === '/admin/settings' ? 'page' : undefined} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Settings size={18}/></Link>
    </div>
  </header>;
}
