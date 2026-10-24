'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, Circle, X, Shield, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
  href?: string;
}

interface HealthResponse {
  onboarding?: {
    complete: boolean;
    checklist: ChecklistItem[];
  };
}

const DISMISS_KEY = 'admin_setup_checklist_dismissed';

export function SetupChecklist() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DISMISS_KEY) === '1';
  });

  const { data, isLoading } = useQuery<HealthResponse>({
    queryKey: ['admin-health-onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/admin/health', { credentials: 'include' });
      if (!res.ok) throw new Error('Health check failed');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const checklist = data?.onboarding?.checklist ?? [];
  const complete = data?.onboarding?.complete ?? false;
  const doneCount = checklist.filter((i) => i.done).length;

  if (dismissed || complete || isLoading) {
    if (isLoading && !dismissed) {
      return (
        <Card className="border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardContent className="py-6 flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
            Checking setup status…
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  if (checklist.length === 0) return null;

  return (
    <Card className="border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-white">First-boot setup</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {doneCount} of {checklist.length} complete — finish these to go live
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60"
            >
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                  {item.label}
                </p>
                {!item.done && item.hint && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.hint}</p>
                )}
              </div>
              {!item.done && item.href && (
                <Link href={item.href}>
                  <Button size="sm" variant="outline" className="shrink-0 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                    Fix
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 pt-2">
          Admin credentials are authenticated securely in MongoDB. Manage administrator credentials at{' '}
          <Link href="/admin/setup" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            /admin/setup
          </Link>.
        </p>
      </CardContent>
    </Card>
  );
}