'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Laptop,
  Trash2,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';

type AdminStatus = {
  authenticated: boolean;
  email?: string;
  role?: string;
  twoFactorEnabled?: boolean;
  passwordChangedAt?: string | null;
  passwordResetRequired?: boolean;
};

type ActiveSession = {
  id: string;
  ipAddress: string;
  deviceInfo: string;
  userAgent: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
};

const inputClass =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )admin_csrf_token=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

export default function AdminSettingsPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // 2FA state
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'setup' | 'verifying'>('idle');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingBusy, setRevokingBusy] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/admin/status', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data?.authenticated) {
        setStatus(data);
      } else {
        setStatusError(true);
      }
    } catch {
      setStatusError(true);
    } finally {
      setStatusLoading(false);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch('/api/admin/sessions', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.sessions) {
        setSessions(data.sessions);
      }
    } catch {
      // Non-fatal
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
    void loadSessions();
  }, []);

  // Password Complexity Validation Helpers
  const passLength = newPassword.length >= 14;
  const passUpper = /[A-Z]/.test(newPassword);
  const passLower = /[a-z]/.test(newPassword);
  const passDigit = /\d/.test(newPassword);
  const passSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const passValid = passLength && passUpper && passLower && passDigit && passSpecial;

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordBusy) return;
    if (!passValid) {
      setPasswordMessage({
        kind: 'error',
        text: 'New password does not meet the 14-character complexity requirements.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ kind: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordBusy(true);
    setPasswordMessage(null);

    try {
      const response = await fetch('/api/admin/account/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Password could not be changed.');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({
        kind: 'success',
        text: 'Password updated successfully. 14+ character policy enforced.',
      });
      setStatus((current) =>
        current
          ? { ...current, passwordChangedAt: new Date().toISOString(), passwordResetRequired: false }
          : current
      );
    } catch (error) {
      setPasswordMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Password update failed.',
      });
    } finally {
      setPasswordBusy(false);
    }
  };

  // 2FA Flow
  const startTwoFactorSetup = async () => {
    setTwoFactorBusy(true);
    setTwoFactorMessage(null);
    try {
      const response = await fetch('/api/admin/account/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'same-origin',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to initialize 2FA setup');

      setTwoFactorSecret(data.secret);
      setOtpauthUri(data.otpauthUri);
      setBackupCodes(data.backupCodes || []);
      setTwoFactorStep('setup');
    } catch (err: any) {
      setTwoFactorMessage({ kind: 'error', text: err.message || 'Setup error' });
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const confirmTwoFactor = async (e: FormEvent) => {
    e.preventDefault();
    if (twoFactorBusy || !verificationCode) return;
    setTwoFactorBusy(true);
    setTwoFactorMessage(null);

    try {
      const response = await fetch('/api/admin/account/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          secret: twoFactorSecret,
          code: verificationCode.trim(),
          backupCodes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Invalid 2FA code');

      setTwoFactorStep('idle');
      setVerificationCode('');
      setTwoFactorMessage({
        kind: 'success',
        text: 'Two-Factor Authentication is now enabled for your account!',
      });
      setStatus((current) => (current ? { ...current, twoFactorEnabled: true } : current));
    } catch (err: any) {
      setTwoFactorMessage({ kind: 'error', text: err.message || 'Verification failed' });
    } finally {
      setTwoFactorBusy(false);
    }
  };

  // Session Revocation
  const revokeSession = async (sessionId?: string, revokeAllOthers = false) => {
    if (revokingBusy) return;
    setRevokingBusy(true);
    setSessionMessage(null);

    try {
      const response = await fetch('/api/admin/sessions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ sessionId, revokeAllOthers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to revoke session');

      setSessionMessage({
        kind: 'success',
        text: data.message || 'Session(s) revoked successfully.',
      });
      await loadSessions();
    } catch (err: any) {
      setSessionMessage({ kind: 'error', text: err.message || 'Error revoking session' });
    } finally {
      setRevokingBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Administrator</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Security & Access Control</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enforce enterprise credentials standards, manage 2FA, and monitor active sessions.
        </p>
      </header>

      {/* Account Overview */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="account-security-title">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 id="account-security-title" className="font-bold text-slate-900">Security Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Live authentication status and active cryptographic posture.</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-2 sm:grid-cols-2 sm:gap-3">
          <StatusRow label="Role" value={status?.role?.replace('_', ' ') || (statusLoading ? 'Loading…' : 'Unavailable')} />
          <StatusRow
            label="Two-factor authentication"
            value={status ? (status.twoFactorEnabled ? 'Active (TOTP)' : 'Disabled') : (statusLoading ? 'Loading…' : 'Unavailable')}
            tone={status?.twoFactorEnabled ? 'good' : 'warning'}
          />
          <StatusRow
            label="Password Policy"
            value="14+ Chars (Enforced)"
            tone="good"
          />
          <StatusRow
            label="Session Token Duration"
            value="15 Minutes"
            tone="good"
          />
        </dl>
        {statusError && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="alert">
            Security status could not be loaded.
          </p>
        )}
      </section>

      {/* Two-Factor Authentication Management */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="two-factor-title">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Smartphone size={20} />
            </span>
            <div>
              <h2 id="two-factor-title" className="font-bold text-slate-900">Two-Factor Authentication (2FA)</h2>
              <p className="mt-1 text-sm text-slate-500">
                Protect your account using standard TOTP authenticator apps (Google Authenticator, Microsoft Authenticator, 1Password).
              </p>
            </div>
          </div>
          {status?.twoFactorEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={14} /> Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              <ShieldAlert size={14} /> Required
            </span>
          )}
        </div>

        {twoFactorMessage && (
          <p
            role={twoFactorMessage.kind === 'success' ? 'status' : 'alert'}
            className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${
              twoFactorMessage.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}
          >
            {twoFactorMessage.kind === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
            {twoFactorMessage.text}
          </p>
        )}

        {twoFactorStep === 'idle' && (
          <div className="mt-5">
            {!status?.twoFactorEnabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-sm font-semibold text-amber-900">MFA is required for administrator accounts</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  Set up your authenticator app now to complete multi-factor verification on sign in.
                </p>
                <button
                  type="button"
                  onClick={startTwoFactorSetup}
                  disabled={twoFactorBusy}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-4 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-60"
                >
                  <QrCode size={15} /> {twoFactorBusy ? 'Generating secret…' : 'Enroll Authenticator App'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                2FA is currently active. Your account is secured with time-based one-time passwords on every login.
              </p>
            )}
          </div>
        )}

        {twoFactorStep === 'setup' && (
          <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="font-bold text-slate-900">Step 1: Scan QR or Enter Secret Key</h3>
            <p className="text-xs leading-relaxed text-slate-600">
              Open your authenticator app and add an account by entering the secret code below or tapping the configuration link:
            </p>

            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="break-all font-mono text-sm font-bold tracking-wider text-indigo-700">{twoFactorSecret}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(twoFactorSecret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {copiedSecret ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedSecret ? 'Copied' : 'Copy Key'}
              </button>
            </div>

            {backupCodes.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-700">Save Your Emergency Backup Codes:</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {backupCodes.map((code) => (
                    <code key={code} className="rounded border border-slate-200 bg-white px-2 py-1 text-center font-mono text-xs font-semibold text-slate-700">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={confirmTwoFactor} className="mt-4 pt-4 border-t border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900">Step 2: Enter the 6-Digit Code from Authenticator</h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  pattern="\d{6}"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="h-11 w-full sm:w-44 rounded-xl border border-slate-300 bg-white px-3 text-center font-mono text-lg font-bold tracking-widest text-slate-900 outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={twoFactorBusy || verificationCode.length !== 6}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {twoFactorBusy ? 'Verifying…' : 'Verify & Enable 2FA'}
                </button>
                <button
                  type="button"
                  onClick={() => setTwoFactorStep('idle')}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Password Management */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="change-password-title">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <KeyRound size={20} />
          </span>
          <div>
            <h2 id="change-password-title" className="font-bold text-slate-900">Change Admin Password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Must be at least 14 characters, containing uppercase, lowercase, numbers, and special symbols.
            </p>
          </div>
        </div>

        <form onSubmit={changePassword} className="mt-5 space-y-4" autoComplete="off">
          <label className="block text-sm font-medium text-slate-700">
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              maxLength={256}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                New password (14+ characters)
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={14}
                  maxLength={256}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </label>

              {/* Real-time complexity check */}
              {newPassword && (
                <div className="mt-2 space-y-1 text-xs">
                  <p className={passLength ? 'text-emerald-700' : 'text-slate-500'}>
                    {passLength ? '✓' : '•'} At least 14 characters
                  </p>
                  <p className={passUpper ? 'text-emerald-700' : 'text-slate-500'}>
                    {passUpper ? '✓' : '•'} At least 1 uppercase letter (A-Z)
                  </p>
                  <p className={passLower ? 'text-emerald-700' : 'text-slate-500'}>
                    {passLower ? '✓' : '•'} At least 1 lowercase letter (a-z)
                  </p>
                  <p className={passDigit ? 'text-emerald-700' : 'text-slate-500'}>
                    {passDigit ? '✓' : '•'} At least 1 number (0-9)
                  </p>
                  <p className={passSpecial ? 'text-emerald-700' : 'text-slate-500'}>
                    {passSpecial ? '✓' : '•'} At least 1 symbol (!@#$%^&*)
                  </p>
                </div>
              )}
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Confirm new password
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={14}
                maxLength={256}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {passwordMessage && (
            <p
              role={passwordMessage.kind === 'success' ? 'status' : 'alert'}
              className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                passwordMessage.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {passwordMessage.kind === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
              {passwordMessage.text}
            </p>
          )}

          <button
            disabled={passwordBusy || !passValid || newPassword !== confirmPassword}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto"
          >
            <KeyRound size={16} />
            {passwordBusy ? 'Updating password…' : 'Update Password (14+ Chars)'}
          </button>
        </form>
      </section>

      {/* Session Control Panel (Part 3.3) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="active-sessions-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Laptop size={20} />
            </span>
            <div>
              <h2 id="active-sessions-title" className="font-bold text-slate-900">Session Control & Active Devices</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review all authenticated browser devices and revoke compromised sessions remotely.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSessions}
              disabled={sessionsLoading}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={13} className={sessionsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => revokeSession(undefined, true)}
              disabled={revokingBusy || sessions.length <= 1}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            >
              <Trash2 size={13} /> Revoke All Other Sessions
            </button>
          </div>
        </div>

        {sessionMessage && (
          <p
            role={sessionMessage.kind === 'success' ? 'status' : 'alert'}
            className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${
              sessionMessage.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}
          >
            {sessionMessage.kind === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
            {sessionMessage.text}
          </p>
        )}

        <div className="mt-5 space-y-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                sess.isCurrent ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-slate-900">{sess.deviceInfo}</p>
                  {sess.isCurrent && (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                      Current Session
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  IP: <span className="font-mono text-slate-700">{sess.ipAddress}</span> · Last active:{' '}
                  {new Date(sess.lastActive).toLocaleString()}
                </p>
              </div>

              {!sess.isCurrent && (
                <button
                  type="button"
                  onClick={() => revokeSession(sess.id)}
                  disabled={revokingBusy}
                  className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={13} /> Revoke
                </button>
              )}
            </div>
          ))}

          {sessions.length === 0 && !sessionsLoading && (
            <p className="py-4 text-center text-xs text-slate-500">No active sessions found.</p>
          )}
        </div>
      </section>

      {/* Recovery Flow Reference */}
      <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <Clock3 size={18} className="mt-0.5 shrink-0 text-slate-500" />
        <div>
          <h2 className="text-sm font-bold text-slate-800">Emergency Recovery Flow</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            If you ever lose access to your primary credentials, recovery tokens are tied to environment secrets and server logs.
          </p>
          <Link href="/admin/password" className="mt-3 inline-flex text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline">
            Open Recovery Flow
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatusRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'good' | 'warning' | 'neutral' }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`text-right text-sm font-bold capitalize ${
          tone === 'good' ? 'text-emerald-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-800'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
