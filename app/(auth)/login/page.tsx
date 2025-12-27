'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Fingerprint, Eye, EyeOff } from 'lucide-react';
import { checkBiometricSupport, authenticateBiometric } from '@/lib/biometric';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'none'>('none');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    checkBiometricSupport().then(({ available, type }) => {
      setBiometricAvailable(available);
      setBiometricType(type);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable || !identifier) {
      setError('Please enter your email/username first');
      return;
    }

    setBiometricLoading(true);
    setError('');

    try {
      // First verify user exists
      const checkResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      if (!checkResponse.ok) {
        setError('User not found. Please use password login first.');
        setBiometricLoading(false);
        return;
      }

      const { userId } = await checkResponse.json();

      // Attempt biometric authentication
      try {
        const success = await authenticateBiometric('', userId);
        
        if (success) {
          // If biometric succeeds, complete login
          const response = await fetch('/api/auth/biometric-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier }),
          });

          const data = await response.json();

          if (response.ok) {
            router.push('/dashboard');
          } else {
            setError('Biometric authentication failed. Please use password.');
          }
        } else {
          setError('Biometric authentication failed. Please use password.');
        }
      } catch (bioError: any) {
        if (bioError.message && bioError.message.includes('cancelled')) {
          setError('Biometric authentication was cancelled');
        } else {
          setError('Biometric authentication failed. Please use password.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--color-background, #f8fafc) 0%, var(--color-surface, #e2e8f0) 50%, var(--color-primary, #3b82f6) 100%)`
      }}
    >
      {/* Animated background elements using theme colors */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"
          style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
        ></div>
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"
          style={{ backgroundColor: 'var(--color-accent, #8b5cf6)' }}
        ></div>
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"
          style={{ backgroundColor: 'var(--color-secondary, #06b6d4)' }}
        ></div>
      </div>
      
      <div 
        className="max-w-md w-full rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 border animate-scale-in relative z-10 backdrop-blur-lg"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'var(--color-border, #e2e8f0)'
        }}
      >
        <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
          <div className="relative inline-block mb-4">
            <div 
              className="absolute inset-0 rounded-full blur-lg opacity-30 animate-pulse"
              style={{ 
                background: `linear-gradient(45deg, var(--color-primary, #3b82f6), var(--color-accent, #8b5cf6))` 
              }}
            ></div>
            <div 
              className="relative w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ 
                background: `linear-gradient(45deg, var(--color-primary, #3b82f6), var(--color-accent, #8b5cf6))` 
              }}
            >
              <span className="text-white font-bold text-xl">H</span>
            </div>
          </div>
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 animate-slide-in-right"
            style={{ 
              background: `linear-gradient(45deg, var(--color-primary, #3b82f6), var(--color-accent, #8b5cf6))`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Welcome Back
          </h1>
          <p className="text-sm sm:text-base font-medium animate-fade-in-up animation-delay-200" style={{ color: 'var(--color-textSecondary, #6b7280)' }}>
            Sign in to track your daily habits
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {error && (
            <div 
              className="border-2 px-4 py-3 rounded-lg font-semibold text-sm animate-shake"
              style={{
                backgroundColor: 'var(--color-error, #fef2f2)',
                borderColor: 'var(--color-error, #ef4444)',
                color: 'var(--color-error, #dc2626)'
              }}
            >
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="animate-fade-in-up animation-delay-300">
              <label htmlFor="identifier" className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text, #111827)' }}>
                Email or Username
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border-2 rounded-xl bg-white outline-none transition-all duration-300 font-medium text-base hover:shadow-md focus:shadow-lg touch-manipulation"
                  style={{
                    borderColor: 'var(--color-border, #d1d5db)',
                    color: 'var(--color-text, #111827)',
                    '--tw-placeholder-color': 'var(--color-textSecondary, #9ca3af)'
                  } as React.CSSProperties}
                  placeholder="Enter your email or username"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 pointer-events-none transition-opacity duration-300 -z-10 blur"
                  style={{ 
                    background: `linear-gradient(45deg, var(--color-primary, #3b82f6), var(--color-accent, #8b5cf6))` 
                  }}
                ></div>
              </div>
            </div>
            <div className="animate-fade-in-up animation-delay-400">
              <label htmlFor="password" className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text, #111827)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 pr-12 border-2 rounded-xl bg-white outline-none transition-all duration-300 font-medium text-base hover:shadow-md focus:shadow-lg touch-manipulation"
                  style={{
                    borderColor: 'var(--color-border, #d1d5db)',
                    color: 'var(--color-text, #111827)',
                    '--tw-placeholder-color': 'var(--color-textSecondary, #9ca3af)'
                  } as React.CSSProperties}
                  placeholder="Enter your password"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200 p-1 rounded-lg hover:bg-gray-100 touch-manipulation"
                  style={{ 
                    color: 'var(--color-textSecondary, #6b7280)',
                    WebkitTapHighlightColor: 'transparent' 
                  }}
                >
                  <div className="transition-transform duration-200 hover:scale-110">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Biometric Login Button */}
          {biometricAvailable && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || !identifier}
              className="w-full text-white py-3 sm:py-3.5 rounded-lg font-bold text-base sm:text-lg transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-xl hover-lift ripple relative overflow-hidden touch-manipulation flex items-center justify-center gap-2 animate-pulse-glow"
              style={{
                background: `linear-gradient(45deg, var(--color-accent, #8b5cf6), var(--color-secondary, #06b6d4))`,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <Fingerprint size={20} className="animate-pulse" />
              <span className="relative z-10">
                {biometricLoading 
                  ? 'Authenticating...' 
                  : biometricType === 'face' 
                    ? 'Sign in with Face ID' 
                    : 'Sign in with Fingerprint'}
              </span>
            </button>
          )}

          <div className="animate-fade-in-up animation-delay-500">
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl hover-lift ripple relative overflow-hidden touch-manipulation active:scale-98 min-h-[48px] flex items-center justify-center"
              style={{
                background: `linear-gradient(45deg, var(--color-primary, #3b82f6), var(--color-accent, #8b5cf6))`,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {loading ? 'Signing in...' : 'Sign In'}
              </span>
            </button>
          </div>
        </form>
        <p className="mt-5 sm:mt-6 text-center text-sm sm:text-base text-gray-700 font-medium">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary-600 hover:text-primary-700 font-bold underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

