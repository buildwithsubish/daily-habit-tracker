'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock3, KeyRound, ShieldCheck } from 'lucide-react';

type AdminStatus = {
  authenticated: boolean;
  email?: string;
  role?: string;
  twoFactorEnabled?: boolean;
  passwordChangedAt?: string | null;
  passwordResetRequired?: boolean;
};

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export default function AdminSettingsPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/status', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load status');
        return response.json();
      })
      .then(data => { if (data?.authenticated) setStatus(data); else setStatusError(true); })
      .catch(error => { if (error.name !== 'AbortError') setStatusError(true); })
      .finally(() => { if (!controller.signal.aborted) setStatusLoading(false); });
    return () => controller.abort();
  }, []);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Password could not be changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ kind: 'success', text: 'Password updated. This browser session has been renewed.' });
      setStatus(current => current ? { ...current, passwordChangedAt: new Date().toISOString(), passwordResetRequired: false } : current);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Password could not be changed.' });
    } finally {
      setBusy(false);
    }
  };

  return <main className="mx-auto max-w-4xl space-y-5 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:space-y-7">
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Administrator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Security settings</h1><p className="mt-2 text-sm text-slate-600">Manage your sign-in credentials and review the security state of this account.</p></header>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="account-security-title">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><ShieldCheck size={19}/></span><div><h2 id="account-security-title" className="font-bold text-slate-900">Account security</h2><p className="mt-1 text-sm text-slate-500">Status is read from your authenticated admin account.</p></div></div>
      <dl className="mt-5 grid gap-2 sm:grid-cols-2 sm:gap-3">
        <StatusRow label="Role" value={status?.role?.replace('_', ' ') || (statusLoading ? 'Loading…' : 'Unavailable')}/>
        <StatusRow label="Two-factor authentication" value={status ? (status.twoFactorEnabled ? 'Enabled' : 'Not enabled') : (statusLoading ? 'Loading…' : 'Unavailable')} tone={status?.twoFactorEnabled ? 'good' : 'neutral'}/>
        <StatusRow label="Password updated" value={status?.passwordChangedAt ? new Date(status.passwordChangedAt).toLocaleDateString() : statusLoading ? 'Loading…' : status ? 'Update required' : 'Unavailable'} tone={status?.passwordResetRequired ? 'warning' : 'neutral'}/>
        <StatusRow label="Password review interval" value="90 days"/>
      </dl>
      {statusError && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="alert">Security status could not be loaded. Refresh this page to try again.</p>}
      {status && !status.twoFactorEnabled && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Two-factor authentication is currently off for this account. Enrollment isn’t available in this admin interface yet.</p>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="change-password-title">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><KeyRound size={19}/></span><div><h2 id="change-password-title" className="font-bold text-slate-900">Change password</h2><p className="mt-1 text-sm text-slate-500">Confirm your current password before saving a new one.</p></div></div>
      <form onSubmit={changePassword} className="mt-5 space-y-4" autoComplete="off">
        <label className="block text-sm font-medium text-slate-700">Current password<input required type="password" autoComplete="current-password" maxLength={256} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className={inputClass}/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">New password<input required type="password" autoComplete="new-password" minLength={8} maxLength={256} value={newPassword} onChange={event => setNewPassword(event.target.value)} className={inputClass}/><span className="mt-1 block text-xs text-slate-500">8+ characters, including uppercase, lowercase and a number.</span></label><label className="block text-sm font-medium text-slate-700">Confirm new password<input required type="password" autoComplete="new-password" minLength={8} maxLength={256} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={inputClass}/></label></div>
        {message && <p role={message.kind === 'success' ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-xl p-3 text-sm ${message.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{message.kind === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0"/> : <AlertCircle size={17} className="mt-0.5 shrink-0"/>}{message.text}</p>}
        <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"><KeyRound size={16}/>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </section>

    <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"><Clock3 size={18} className="mt-0.5 shrink-0 text-slate-500"/><div><h2 className="text-sm font-bold text-slate-800">System configuration</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">API keys and deployment secrets aren’t editable in this dashboard. Manage them in your hosting environment. Password recovery uses the server recovery key and is intended for account recovery only.</p><Link href="/admin/password" className="mt-3 inline-flex text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline">Open recovery flow</Link></div></section>
  </main>;
}

function StatusRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'good' | 'warning' | 'neutral' }) {
  return <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`text-right text-sm font-bold capitalize ${tone === 'good' ? 'text-emerald-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-800'}`}>{value}</dd></div>;
}
