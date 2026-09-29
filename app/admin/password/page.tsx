'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { isStrongPassword, isValidEmail } from '@/lib/security';

export default function AdminPasswordPage() {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submittingRef.current || loading) return;

      const errors: Record<string, string> = {};
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) errors.email = 'Email is required';
      else if (!isValidEmail(normalizedEmail)) errors.email = 'Enter a valid email address';

      if (!password) errors.password = 'Password is required';
      else if (!isStrongPassword(password)) {
        errors.password = 'Use 8+ characters with upper, lower, and a number';
      }

      if (password !== confirm) errors.confirm = 'Passwords do not match';
      if (!setupToken.trim()) errors.setupToken = 'Recovery key is required';

      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;

      submittingRef.current = true;
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/admin/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            confirmPassword: confirm,
            setupToken,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.details && typeof data.details === 'object') {
            setFieldErrors({
              email: data.details.email,
              password: data.details.password,
              confirm: data.details.confirmPassword,
              setupToken: data.details.setupToken,
            });
          }
          setError(data.message || 'Unable to update password');
          return;
        }

        setSuccess(true);
        setTimeout(() => router.push('/admin/login'), 2000);
      } catch {
        setError('Connection error. Please try again.');
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    },
    [email, password, confirm, setupToken, loading, router]
  );

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Password updated</h1>
          <p className="text-sm text-gray-600">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        html, body {
          background-color: rgb(243 244 246) !important;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg mb-4">
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Update password</h1>
            <p className="text-gray-600 text-sm mt-2">
              Authorized recovery using your server recovery key
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div
                  className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="recovery-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                    fieldErrors.email ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="Account email"
                  autoComplete="email"
                  disabled={loading}
                />
                {fieldErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="recovery-key" className="block text-sm font-semibold text-gray-700 mb-2">
                  <KeyRound className="inline w-4 h-4 mr-1 text-gray-500" />
                  Recovery key
                </label>
                <input
                  id="recovery-key"
                  type="password"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                    fieldErrors.setupToken ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="Server recovery key"
                  autoComplete="off"
                  disabled={loading}
                />
                {fieldErrors.setupToken ? (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors.setupToken}</p>
                ) : (
                  <p className="text-gray-500 text-xs mt-1">
                    Set as <code className="text-gray-600">ADMIN_SETUP_TOKEN</code> on the server
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-2">
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-11 pr-11 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                      fieldErrors.password ? 'border-red-400' : 'border-gray-300'
                    }`}
                    placeholder="New password"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full pl-11 pr-11 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                      fieldErrors.confirm ? 'border-red-400' : 'border-gray-300'
                    }`}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirm && (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors.confirm}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3.5 rounded-xl font-semibold hover:from-red-700 hover:to-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <Link
                href="/admin/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}