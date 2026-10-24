'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  Shield,
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  // Floating label focus states
  const [isIdentifierFocused, setIsIdentifierFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!identifier.trim()) {
      setError('Email or username is required');
      triggerShake();
      return;
    }

    if (!password) {
      setError('Password is required');
      triggerShake();
      return;
    }

    if (showTwoFactor && (!twoFactorCode.trim() || !/^\d{6}$/.test(twoFactorCode))) {
      setError('Please enter a valid 6-digit verification code');
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          keepSignedIn,
          ...(showTwoFactor ? { twoFactorCode: twoFactorCode.trim() } : {}),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresTwoFactor) {
          setShowTwoFactor(true);
          setLoading(false);
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          router.push(redirect);
          router.refresh();
        }, 500);
      } else {
        triggerShake();
        setError(data.error || 'Invalid email or password');
      }
    } catch {
      triggerShake();
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#090A0F] text-[#F8FAFC] selection:bg-[#10B981]/30 selection:text-[#10B981] overflow-hidden">
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#8B5CF6]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#10B981]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Card with Subtle Shake Animation on Error */}
      <motion.div
        animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#12141D]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-black/80"
      >
        {/* Header with Brand Icon */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#8B5CF6] p-0.5 shadow-lg shadow-[#10B981]/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#12141D]">
              <Sparkles className="h-6 w-6 text-[#10B981]" />
            </div>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {showTwoFactor ? 'Two-Factor Check' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#94A3B8]">
            {showTwoFactor
              ? 'Enter the 6-digit security code from your authenticator'
              : 'Sign in to access your habit streaks & analytics'}
          </p>
        </div>

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400"
            >
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 font-medium"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>Secure authentication verified. Redirecting…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
          {!showTwoFactor ? (
            <>
              {/* Floating Label Input: Email / Username */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#94A3B8]">
                  <Mail size={17} />
                </div>
                <input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onFocus={() => setIsIdentifierFocused(true)}
                  onBlur={() => setIsIdentifierFocused(false)}
                  className="peer h-13 w-full rounded-2xl border border-white/[0.08] bg-[#090A0F]/60 pl-10 pr-4 pt-4 pb-1 text-sm text-white placeholder-transparent outline-none transition duration-200 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50"
                  placeholder="Email or Username"
                />
                <label
                  htmlFor="identifier"
                  className={`pointer-events-none absolute left-10 transition-all duration-200 ${
                    isIdentifierFocused || identifier
                      ? 'top-1.5 text-[10px] font-semibold text-[#10B981]'
                      : 'top-3.5 text-xs text-[#94A3B8]'
                  }`}
                >
                  Email or Username
                </label>
              </div>

              {/* Floating Label Input: Password */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#94A3B8]">
                  <Lock size={17} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="peer h-13 w-full rounded-2xl border border-white/[0.08] bg-[#090A0F]/60 pl-10 pr-11 pt-4 pb-1 text-sm text-white placeholder-transparent outline-none transition duration-200 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50"
                  placeholder="Password"
                />
                <label
                  htmlFor="password"
                  className={`pointer-events-none absolute left-10 transition-all duration-200 ${
                    isPasswordFocused || password
                      ? 'top-1.5 text-[10px] font-semibold text-[#10B981]'
                      : 'top-3.5 text-xs text-[#94A3B8]'
                  }`}
                >
                  Password
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#94A3B8] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {/* Keep Me Signed In & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-[#090A0F] text-[#10B981] focus:ring-[#10B981] focus:ring-offset-[#12141D]"
                  />
                  <span className="text-[#94A3B8] hover:text-white transition">Keep me signed in</span>
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs font-semibold text-[#8B5CF6] hover:text-violet-400 transition"
                >
                  Forgot password?
                </Link>
              </div>
            </>
          ) : (
            /* Step-Up 2FA View */
            <div className="space-y-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#10B981]">
                  <Smartphone size={18} />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  pattern="\d{6}"
                  autoFocus
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="h-14 w-full rounded-2xl border border-white/[0.08] bg-[#090A0F]/80 pl-11 pr-4 text-center font-mono text-xl font-bold tracking-[0.3em] text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowTwoFactor(false)}
                className="w-full text-center text-xs text-[#94A3B8] hover:text-white transition"
              >
                ← Back to credentials
              </button>
            </div>
          )}

          {/* Invisible Bot Protection Placeholder (Turnstile / reCAPTCHA v3) */}
          <div id="cf-turnstile-container" className="hidden" aria-hidden="true" />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="group relative mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] px-6 text-sm font-bold text-white shadow-lg shadow-[#10B981]/25 transition duration-200 hover:from-[#059669] hover:to-[#047857] hover:shadow-[#10B981]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Verifying Credentials…
              </span>
            ) : showTwoFactor ? (
              <>
                Confirm 2FA Code <ArrowRight size={16} />
              </>
            ) : (
              <>
                Sign In to Dashboard <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 border-t border-white/[0.06] pt-4 text-center text-xs text-[#94A3B8]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-bold text-[#10B981] hover:underline">
            Create account
          </Link>
        </div>

        {/* Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#94A3B8]/60">
          <ShieldCheck size={13} className="text-[#10B981]" />
          <span>Meta/X Dual-Token __Host- Cookie Architecture</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090A0F] flex items-center justify-center text-[#94A3B8] text-xs">
          Loading secure portal…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
