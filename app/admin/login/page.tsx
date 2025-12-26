'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Login failed');
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Admin Access
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium">Secure administrator login</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-lg font-semibold text-sm">
              {error}
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-medium text-base"
              placeholder="admin@habittracker.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-medium text-base"
                placeholder="Enter admin password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 sm:py-3.5 rounded-lg font-bold text-base sm:text-lg hover:from-red-700 hover:to-red-600 transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-xl hover-lift ripple relative overflow-hidden touch-manipulation"
          >
            <span className="relative z-10">{loading ? 'Authenticating...' : 'Login'}</span>
          </button>
        </form>
        <div className="mt-5 sm:mt-6 text-center">
          <button
            onClick={() => router.push('/admin/reset-password')}
            className="text-sm text-gray-600 hover:text-red-600 font-semibold underline"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}

