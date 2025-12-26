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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 border border-gray-200/50 animate-scale-in">
        <div className="text-center mb-5 sm:mb-6 md:mb-8 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium">Sign in to track your daily habits</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-lg font-semibold text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="identifier" className="block text-sm font-bold text-gray-900 mb-1.5">
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-medium text-base"
              placeholder="Enter your email or username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-medium text-base"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Biometric Login Button */}
          {biometricAvailable && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || !identifier}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 sm:py-3.5 rounded-lg font-bold text-base sm:text-lg hover:from-purple-700 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-xl hover-lift ripple relative overflow-hidden touch-manipulation flex items-center justify-center gap-2 animate-pulse-glow"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3 sm:py-3.5 rounded-lg font-bold text-base sm:text-lg hover:from-primary-700 hover:to-primary-600 transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-xl hover-lift ripple relative overflow-hidden touch-manipulation"
          >
            <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In with Password'}</span>
          </button>
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

