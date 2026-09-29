'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check, Clock3, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'habit-reminder';

export default function SettingsPage() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('09:00');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [timeZone, setTimeZone] = useState('your device’s local time');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const value = JSON.parse(stored);
        setEnabled(Boolean(value.enabled));
        if (typeof value.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) setTime(value.time);
      }
      setPermission('Notification' in window ? Notification.permission : 'unsupported');
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'your device’s local time');
    } catch { /* retain defaults */ }
    fetch('/api/user/profile', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load your preferences');
        return response.json();
      })
      .then(data => {
        if (data && typeof data.reminderEnabled === 'boolean') setEnabled(data.reminderEnabled);
        if (data && typeof data.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime)) setTime(data.reminderTime);
        setSaved(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setReady(true));
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      if (enabled && 'Notification' in window && permission === 'default') {
        try {
          const nextPermission = await Notification.requestPermission();
          setPermission(nextPermission);
        } catch {
          setPermission('denied');
        }
      }
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderEnabled: enabled, reminderTime: time }),
      });
      if (!response.ok) throw new Error('Could not save reminder preferences');
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, time })); } catch { /* account preferences are already saved */ }
      setSaved(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save reminder preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <div className="mx-auto max-w-2xl px-4 py-12 text-sm text-slate-500">Loading preferences…</div>;

  return <main className="mx-auto max-w-3xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
    <header className="mb-6 sm:mb-8"><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-700 dark:text-indigo-300">Preferences</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">A reminder that fits your day</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">Choose one calm check-in time. Your schedule and local time zone stay in your control.</p></header>
    {loadError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100" role="alert">Your saved settings could not be loaded. You can still update them below.</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="p-4 sm:p-6">
      <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"><Bell size={20}/></div><div className="min-w-0 flex-1"><h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Daily habit check-in</h2><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">One reminder to help you record your progress, without repeated alerts.</p></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reminder time <span className="font-normal text-slate-500">({timeZone})</span><input aria-label="Reminder time" type="time" value={time} onChange={event => { setTime(event.target.value); setSaved(false); }} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-900"/></label>
        <button type="button" onClick={() => { setEnabled(!enabled); setSaved(false); }} aria-pressed={enabled} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:w-auto ${enabled ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800' : 'bg-indigo-700 text-white hover:bg-indigo-800'}`}>{enabled ? <><BellOff size={16}/>Turn off</> : <><Bell size={16}/>Enable reminder</>}</button>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/70"><Clock3 size={17} className="mt-0.5 shrink-0 text-slate-500"/><p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">The reminder checks at this local time while the app is open. If your browser allows notifications and permission is granted, it can show a system alert; otherwise it uses an in-app message. Background alerts while the app is closed are not configured.</p></div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 dark:border-slate-700"><Smartphone size={17} className="mt-0.5 shrink-0 text-slate-500"/><div className="min-w-0"><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Notification permission</p><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{permission === 'unsupported' ? 'This browser does not support system notifications.' : permission === 'granted' ? 'Allowed by your browser.' : permission === 'denied' ? 'Blocked by your browser. Change this in browser or device settings to receive system alerts.' : 'Not requested. You can allow notifications when saving an enabled reminder.'}</p></div></div>
      </div>
      <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="min-h-5 text-sm text-slate-600 dark:text-slate-400" aria-live="polite">{saved ? 'Your preferences are saved.' : 'Unsaved changes.'}</p>
        <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"/>Saving…</> : <><Check size={16}/>{saved ? 'Saved' : 'Save preferences'}</>}</button>
      </footer>
    </section>
  </main>;
}
