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
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="py-6 flex items-center gap-3 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            Checking setup status…
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  if (checklist.length === 0) return null;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-slate-900">First-boot setup</CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
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
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
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
              className="flex items-start gap-3 p-3 rounded-lg bg-white/80 border border-slate-100"
            >
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {item.label}
                </p>
                {!item.done && item.hint && (
                  <p className="text-xs text-slate-500 mt-0.5">{item.hint}</p>
                )}
              </div>
              {!item.done && item.href && (
                <Link href={item.href}>
                  <Button size="sm" variant="outline" className="shrink-0 text-xs">
                    Fix
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 pt-2">
          Admin credentials use Option B: create once at{' '}
          <Link href="/admin/setup" className="text-indigo-600 hover:underline">
            /admin/setup
          </Link>{' '}
          (production requires <code className="bg-slate-100 px-1 rounded">ADMIN_SETUP_TOKEN</code>).
        </p>
      </CardContent>
    </Card>
  );
}