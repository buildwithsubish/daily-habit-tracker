'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Eye, EyeOff, AlertCircle, Loader2, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [setupHint, setSetupHint] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('setup') === 'complete') {
      setSetupHint('Admin account created successfully. Log in below.');
    }
  }, [searchParams]);

  useEffect(() => {
    // Check setup status and existing session
    const checkAuth = async () => {
      try {
        const setupRes = await fetch('/api/admin/setup');
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          if (setupData.needsSetup) {
            router.replace('/admin/setup');
            return;
          }
        }

        const res = await fetch('/api/admin/status', { credentials: 'include' });
        if (res.ok) {
          router.push(redirect);
        }
      } catch (error) {
        // Not authenticated, stay on login
      }
    };
    checkAuth();
  }, [router, redirect]);

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const validateTwoFactor = () => {
    let isValid = true;
    setTwoFactorError('');

    if (!twoFactorCode) {
      setTwoFactorError('2FA code is required');
      isValid = false;
    } else if (!/^\d{6}$/.test(twoFactorCode)) {
      setTwoFactorError('Please enter a valid 6-digit code');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showTwoFactor) {
      if (!validateTwoFactor()) return;
    } else {
      if (!validateForm()) return;
    }
    
    setError('');
    setLoading(true);

    try {
      const payload: Record<string, string> = { 
        email, 
        password,
      };
      
      if (showTwoFactor) {
        payload.twoFactorCode = twoFactorCode;
      }

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if 2FA is required
        if (data.requiresTwoFactor) {
          setShowTwoFactor(true);
          setLoading(false);
          setError('');
          return;
        }
        
        // Login successful - use window.location for reliable redirect
        const targetUrl = data.passwordExpired ? '/admin/settings?tab=security' : redirect;
        window.location.replace(targetUrl);
        return;
      } else {
        const errorCode = data.errorCode || data.code;
        if (errorCode === 'NEEDS_SETUP') {
          router.replace('/admin/setup');
          return;
        }

        // Handle specific error codes
        if (errorCode === 'ACCOUNT_LOCKED') {
          // Parse lockout time from error message
          const match = data.error.match(/(\d+)/);
          if (match) {
            setLockoutRemaining(parseInt(match[1]));
          }
        }
        
        if (errorCode === 'IP_NOT_ALLOWED') {
          setError('Your IP address is not authorized to access this admin panel.');
        } else if (errorCode === 'INVALID_2FA') {
          setTwoFactorError('Invalid 2FA code. Please try again.');
        } else {
          setError(data.message || data.error || 'Invalid credentials. Please try again.');
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Prevent hydration mismatch by showing loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Force light mode styles */}
      <style jsx global>{`
        html, body {
          background-color: rgb(243 244 246) !important;
          color: rgb(17 24 39) !important;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
      
      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-2xl mb-4">
            <Shield className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-gray-600 text-sm mt-2">Secure administrator access</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {setupHint && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                {setupHint}
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Lockout Alert */}
            {lockoutRemaining !== null && (
              <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl">
                <Lock size={20} />
                <span className="text-sm font-medium">
                  Account locked. Try again in {lockoutRemaining} minutes.
                </span>
              </div>
            )}

            {showTwoFactor ? (
              <>
                {/* 2FA Alert */}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl">
                  <KeyRound size={20} />
                  <span className="text-sm font-medium">Two-Factor Authentication Required</span>
                </div>

                {/* 2FA Code Field */}
                <div>
                  <label htmlFor="twoFactorCode" className="block text-sm font-semibold text-gray-700 mb-2">
                    <KeyRound className="inline w-4 h-4 mr-1" />
                    Two-Factor Authentication
                  </label>
                  <input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-center text-2xl tracking-widest font-mono ${
                      twoFactorError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                  {twoFactorError && (
                    <p className="text-red-600 text-xs mt-1">{twoFactorError}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                {/* Back to Password Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowTwoFactor(false);
                    setTwoFactorCode('');
                    setTwoFactorError('');
                  }}
                  className="w-full text-gray-600 hover:text-gray-900 text-sm transition-colors"
                >
                  ← Back to password
                </button>
              </>
            ) : (
              <>
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Account email"
                    autoComplete="email"
                  />
                  {emailError && (
                    <p className="text-red-600 text-xs mt-1">{emailError}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-12 pr-12 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all ${
                        passwordError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-red-600 text-xs mt-1">{passwordError}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.push('/admin/password')}
                    className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    Update password
                  </button>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-4 rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{showTwoFactor ? 'Verify 2FA' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-500 text-xs">
              This is a secure area. All login attempts are monitored and logged.
              <br />
              Unauthorized access is prohibited and may be prosecuted.
            </p>
          </div>
        </div>

        {/* Back to Home / Logout */}
        <div className="text-center mt-6 space-y-2">
          <a href="/" className="block text-gray-600 hover:text-gray-900 text-sm transition-colors">
            ← Back to App
          </a>
          <button
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
              window.location.reload();
            }}
            className="text-gray-500 hover:text-gray-700 text-xs transition-colors"
          >
            Clear Session & Start Fresh
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
