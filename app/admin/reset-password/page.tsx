'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Lock } from 'lucide-react';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        if (process.env.NODE_ENV === 'development' && data.resetToken) {
          setSuccess(`Reset token generated: ${data.resetToken}`);
          setResetToken(data.resetToken);
          setStep('reset');
        } else {
          setSuccess('If the email exists, check your email for reset instructions.');
        }
      } else {
        setError(data.error || 'Failed to request reset');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 border-2 border-gray-200/50 animate-scale-in">
        <div className="text-center mb-5 sm:mb-6 md:mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-4">
            <Key className="text-white" size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Reset Admin Password
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            {step === 'request' ? 'Request password reset' : 'Enter new password'}
          </p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-lg font-semibold text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border-2 border-green-200 text-green-800 px-4 py-3 rounded-lg font-semibold text-sm">
                {success}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-1.5">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium text-base"
                placeholder="admin@habittracker.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-3 sm:py-3.5 rounded-lg font-bold text-base sm:text-lg hover:from-orange-700 hover:to-orange-600 transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-xl hover-lift ripple relative overflow-hidden touch-manipulation"
            >
              <span className="relative z-10">{loading ? 'Generating...' : 'Request Reset Token'}</span>
            </button>
            {resetToken && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setStep('reset')}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                >
                  Continue to Reset
                </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-lg font-semibold text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border-2 border-green-200 text-green-800 px-4 py-3 rounded-lg font-semibold text-sm">
                {success}
              </div>
            )}
            <div>
              <label htmlFor="resetToken" className="block text-sm font-bold text-gray-900 mb-1.5">
                Reset Token
              </label>
              <input
                id="resetToken"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium text-base font-mono"
                placeholder="Enter reset token"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-bold text-gray-900 mb-1.5">
                New Password (min 12 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium text-base"
                  placeholder="Enter new password"
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-900 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium text-base"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-3 sm:py-3.5 rounded-lg font-bold text-base sm:text-lg hover:from-orange-700 hover:to-orange-600 transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-xl hover-lift ripple relative overflow-hidden touch-manipulation"
            >
              <span className="relative z-10">{loading ? 'Resetting...' : 'Reset Password'}</span>
            </button>
            <button
              type="button"
              onClick={() => setStep('request')}
              className="w-full text-gray-600 hover:text-gray-900 text-sm font-semibold"
            >
              Back to Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

