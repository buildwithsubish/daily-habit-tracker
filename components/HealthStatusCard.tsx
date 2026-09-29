'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Heart, Ruler, Scale, UserRound, ChevronRight } from 'lucide-react';
import { DailyLog } from '@/types';

interface HealthStatusCardProps {
  onSetupRequest?: () => void;
  logs?: DailyLog[];
}

type HealthProfile = {
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  activityLevel?: string;
  healthGoal?: 'loss' | 'maintain' | 'gain';
};

const goalLabel: Record<string, string> = {
  loss: 'Weight management',
  maintain: 'Maintain current weight',
  gain: 'Build weight',
};

export default function HealthStatusCard({ onSetupRequest, logs = [] }: HealthStatusCardProps) {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/user/profile', { signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => setProfile(data?.age ? data : null))
      .catch(error => { if (error.name !== 'AbortError') console.error('Failed to fetch health profile:', error); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const weeklyActivity = useMemo(() => {
    const recent = logs.filter(log => log.completed && log.workoutData);
    return {
      sessions: recent.length,
      recordedCalories: recent.reduce((total, log) => total + (log.workoutData?.caloriesBurned || 0), 0),
    };
  }, [logs]);

  if (loading) return <div className="card h-52 animate-pulse bg-slate-50 dark:bg-slate-800/30" aria-label="Loading health insights" />;

  if (!profile) return (
    <button type="button" onClick={onSetupRequest} className="card group flex min-h-52 w-full flex-col items-center justify-center border-2 border-dashed border-slate-200 p-6 text-center transition hover:border-indigo-300 dark:border-slate-800 dark:hover:border-indigo-700">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Heart size={21}/></span>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">Add your health profile</span>
      <span className="mt-1 max-w-56 text-xs leading-relaxed text-slate-500">See your saved profile details and a simple summary of logged activity.</span>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">Set up profile <ChevronRight size={14}/></span>
    </button>
  );

  const details = [
    { label: 'Weight', value: profile.weight ? `${profile.weight} kg` : 'Not set', icon: Scale },
    { label: 'Height', value: profile.height ? `${profile.height} cm` : 'Not set', icon: Ruler },
    { label: 'Age', value: profile.age ? `${profile.age} years` : 'Not set', icon: UserRound },
    { label: 'Activity', value: profile.activityLevel?.replace(/([A-Z])/g, ' $1') || 'Not set', icon: Activity },
  ];

  return (
    <section className="card relative overflow-hidden p-5 sm:p-6" aria-labelledby="health-insights-title">
      <div className="pointer-events-none absolute -right-8 -top-10 text-rose-500/[0.06]"><Heart size={150}/></div>
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Heart size={19}/></span>
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Health profile</p><h2 id="health-insights-title" className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">{profile.healthGoal ? goalLabel[profile.healthGoal] || 'Personal health' : 'Your details'}</h2></div>
        </div>
        <button type="button" onClick={onSetupRequest} aria-label="Edit health profile" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><ChevronRight size={17}/></button>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2.5">
        {details.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <Icon size={16} className="shrink-0 text-slate-500"/>
            <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p><p className="truncate text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">{value}</p></div>
          </div>
        ))}
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div><p className="text-xs font-medium text-slate-600 dark:text-slate-300">Workout entries · history view</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{weeklyActivity.sessions} <span className="text-xs font-medium text-slate-500">sessions</span></p></div>
        {weeklyActivity.recordedCalories > 0 && <div className="text-right"><p className="text-xs font-medium text-slate-600 dark:text-slate-300">Recorded burn</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{weeklyActivity.recordedCalories.toLocaleString()} <span className="text-xs font-medium text-slate-500">kcal</span></p></div>}
      </div>
      <p className="relative mt-3 text-[11px] leading-relaxed text-slate-500">Activity reflects workout entries you logged. It doesn’t estimate weight change or food intake.</p>
    </section>
  );
}
