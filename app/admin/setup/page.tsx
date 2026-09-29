'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Loader2, AlertCircle, CheckCircle2, LogIn, KeyRound } from 'lucide-react';
import { isStrongPassword, isValidEmail } from '@/lib/security';

interface SetupStatus {
  success?: boolean;
  needsSetup?: boolean;
  setupTokenRequired?: boolean;

  message?: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
  setupToken?: string;
  form?: string;
}

function validateClient(
  email: string,
  password: string,
  confirm: string,
  tokenRequired: boolean,
  setupToken: string
): FieldErrors {
  const errors: FieldErrors = {};
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) errors.email = 'Email is required';
  else if (!isValidEmail(normalizedEmail)) errors.email = 'Invalid email format';

  if (!password) errors.password = 'Password is required';
  else if (!isStrongPassword(password)) {
    errors.password = 'Min 8 chars with uppercase, lowercase, and a number';
  }

  if (password !== confirm) errors.confirm = 'Passwords do not match';

  if (tokenRequired && !setupToken.trim()) {
    errors.setupToken = 'Setup token is required';
  }

  return errors;
}

export default function AdminSetupPage() {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [tokenRequired, setTokenRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/setup')
      .then((r) => r.json())
      .then((data: SetupStatus) => {
        if (cancelled) return;
        if (!data.needsSetup) {
          setAlreadyConfigured(true);
          return;
        }
        setTokenRequired(!!data.setupTokenRequired);
      })
      .catch(() => {
        if (!cancelled) setFieldErrors({ form: 'Could not check setup status' });
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submittingRef.current || loading) return;

      const errors = validateClient(email, password, confirm, tokenRequired, setupToken);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;

      submittingRef.current = true;
      setLoading(true);
      setFieldErrors({});

      try {
        const res = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            setupToken: tokenRequired ? setupToken : undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.errorCode === 'ADMIN_EXISTS') {
            setAlreadyConfigured(true);
            setFieldErrors({
              form: 'An admin account already exists. Log in or reset your password.',
            });
            return;
          }
          if (data.details && typeof data.details === 'object') {
            setFieldErrors({
              email: data.details.email,
              password: data.details.password,
              confirm: data.details.confirmPassword,
              setupToken: data.details.setupToken,
              form: data.message,
            });
          } else {
            setFieldErrors({ form: data.message || 'Setup failed' });
          }
          return;
        }

        setSuccess(true);
        setTimeout(() => router.push('/admin/login?setup=complete'), 1200);
      } catch {
        setFieldErrors({ form: 'Network error during setup' });
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    },
    [email, password, confirm, tokenRequired, setupToken, loading, router]
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" aria-label="Loading" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <p className="text-lg font-semibold text-slate-900">Admin account created</p>
          <p className="text-sm text-slate-500">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  if (alreadyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="p-3 bg-emerald-100 rounded-xl w-fit mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Admin already configured</h1>
          <p className="text-sm text-slate-600 mb-4">
            Setup only runs once. An admin account is already stored in MongoDB.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/admin/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Go to login
            </Link>
            <Link
              href="/admin/password"
              className="w-full py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <KeyRound className="w-4 h-4" />
              Update password
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-6">
            Recovery requires your server <code className="bg-slate-100 px-1 rounded">ADMIN_SETUP_TOKEN</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Setup</h1>
            <p className="text-sm text-slate-500">One-time account creation (stored in MongoDB)</p>
          </div>
        </div>

        {fieldErrors.form && (
          <div
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {fieldErrors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="setup-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="setup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.email ? 'border-red-400' : 'border-slate-300'
              }`}
              autoComplete="email"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="setup-password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="setup-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.password ? 'border-red-400' : 'border-slate-300'
              }`}
              autoComplete="new-password"
              disabled={loading}
            />
            {fieldErrors.password ? (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Min 8 chars, upper, lower, and number</p>
            )}
          </div>

          <div>
            <label htmlFor="setup-confirm" className="block text-sm font-medium text-slate-700 mb-1">
              Confirm password
            </label>
            <input
              id="setup-confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.confirm ? 'border-red-400' : 'border-slate-300'
              }`}
              autoComplete="new-password"
              disabled={loading}
            />
            {fieldErrors.confirm && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.confirm}</p>
            )}
          </div>

          {tokenRequired && (
            <div>
              <label htmlFor="setup-token" className="block text-sm font-medium text-slate-700 mb-1">
                Setup token
              </label>
              <input
                id="setup-token"
                type="password"
                required
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                  fieldErrors.setupToken ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder="ADMIN_SETUP_TOKEN from .env.local"
                disabled={loading}
              />
              {fieldErrors.setupToken && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.setupToken}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create admin account'}
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-6 text-center">
          Or run <code className="bg-slate-100 px-1 rounded">npm run bootstrap-admin</code> on the
          server
        </p>
      </div>
    </div>
  );
}