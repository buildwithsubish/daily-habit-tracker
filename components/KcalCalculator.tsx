'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, HeartPulse, Info, Save, UserRound } from 'lucide-react';

interface HealthProfile {
  age?: number;
  height?: number;
  weight?: number;
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
  healthGoal?: 'loss' | 'maintain' | 'gain';
}

interface KcalCalculatorProps {
  onSave?: (data: HealthProfile) => void;
  initialData?: HealthProfile;
}

const activityMultipliers: Record<NonNullable<HealthProfile['activityLevel']>, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-900/50';

export default function KcalCalculator({ onSave, initialData }: KcalCalculatorProps) {
  const [profile, setProfile] = useState<HealthProfile>(initialData || {});

  useEffect(() => setProfile(initialData || {}), [initialData]);

  const estimate = useMemo(() => {
    const { age, height, weight, gender, activityLevel } = profile;
    if (!age || !height || !weight || !gender || !activityLevel) return null;
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : gender === 'female' ? -161 : -78);
    return { resting: Math.round(bmr), daily: Math.round(bmr * activityMultipliers[activityLevel]) };
  }, [profile]);

  const setNumber = (field: 'age' | 'height' | 'weight', raw: string) => {
    const value = raw === '' ? undefined : Number(raw);
    setProfile(current => ({ ...current, [field]: value }));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"><HeartPulse size={20}/></span>
        <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Health profile</h3><p className="mt-0.5 text-xs text-slate-500">Your details and optional energy estimate</p></div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Age<input aria-label="Age" type="number" min="13" max="120" value={profile.age ?? ''} onChange={event => setNumber('age', event.target.value)} className={inputClass} placeholder="Years"/></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Height<input aria-label="Height" type="number" min="80" max="250" value={profile.height ?? ''} onChange={event => setNumber('height', event.target.value)} className={inputClass} placeholder="cm"/></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Weight<input aria-label="Weight" type="number" min="25" max="400" value={profile.weight ?? ''} onChange={event => setNumber('weight', event.target.value)} className={inputClass} placeholder="kg"/></label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Sex used by estimate<select aria-label="Sex used by estimate" value={profile.gender || ''} onChange={event => setProfile(current => ({ ...current, gender: (event.target.value || undefined) as HealthProfile['gender'] }))} className={inputClass}><option value="">Choose</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other / prefer not to say</option></select></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Usual activity<select aria-label="Usual activity" value={profile.activityLevel || ''} onChange={event => setProfile(current => ({ ...current, activityLevel: (event.target.value || undefined) as HealthProfile['activityLevel'] }))} className={inputClass}><option value="">Choose</option><option value="sedentary">Mostly seated</option><option value="light">Light activity</option><option value="moderate">Moderate activity</option><option value="very">Very active</option><option value="extra">Highly active</option></select></label>
        </div>

        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Personal goal<select aria-label="Personal goal" value={profile.healthGoal || ''} onChange={event => setProfile(current => ({ ...current, healthGoal: (event.target.value || undefined) as HealthProfile['healthGoal'] }))} className={inputClass}><option value="">Choose (optional)</option><option value="loss">Weight management</option><option value="maintain">Maintain current weight</option><option value="gain">Build weight</option></select></label>

        {estimate ? <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Activity size={16} className="text-indigo-600 dark:text-indigo-300"/> Estimated daily energy use</div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70"><p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">At rest</p><p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{estimate.resting.toLocaleString()} <span className="text-xs font-medium text-slate-500">kcal/day</span></p></div><div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70"><p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">With activity</p><p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{estimate.daily.toLocaleString()} <span className="text-xs font-medium text-slate-500">kcal/day</span></p></div></div>
          <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400"><Info size={14} className="mt-0.5 shrink-0"/>A rough formula-based estimate, not a nutrition prescription. Actual needs vary. This app does not track food intake and won’t predict weight change.</p>
        </div> : <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/70">Add age, height, weight, sex and usual activity to see an approximate energy-use estimate. You can save your profile without completing every field.</p>}

        {onSave && <button type="button" onClick={() => onSave(profile)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-300 dark:text-slate-950 dark:hover:bg-indigo-200"><Save size={16}/>Save health profile</button>}
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500"><UserRound size={14} className="mt-0.5 shrink-0"/>Profile data is used for this on-screen estimate and your health summary.</p>
      </div>
    </section>
  );
}
