'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

export default function Home() {
  const router = useRouter();
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Check if user is logged in
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden" style={{
        background: `linear-gradient(135deg, var(--color-background, #f8fafc) 0%, var(--color-surface, #f1f5f9) 50%, var(--color-background, #f8fafc) 100%)`
      }}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{backgroundColor: 'var(--color-primary, #3b82f6)'}}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" style={{backgroundColor: 'var(--color-accent, #8b5cf6)'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" style={{backgroundColor: 'var(--color-secondary, #06b6d4)'}}></div>
      </div>

      <div className="max-w-6xl w-full relative z-10">
        <div className="text-center mb-10 sm:mb-16 animate-fade-in-up">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-2xl mb-6 animate-scale-in" style={{
              background: `linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, var(--color-primary-dark, #2563eb) 100%)`
            }}>
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 sm:mb-6">
            <span className="bg-clip-text text-transparent" style={{
              background: `linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, var(--color-accent, #8b5cf6) 50%, var(--color-secondary, #06b6d4) 100%)`
            }}>
              Daily Habit Tracker
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-8 sm:mb-10 max-w-3xl mx-auto px-4 font-medium">
            Build consistency, track progress, and achieve your goals with simple daily tracking
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center px-4">
            <Link
              href="/register"
              className="group px-8 sm:px-10 py-3.5 sm:py-4 text-white rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover-lift ripple relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, var(--color-primary-dark, #2563eb) 100%)`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, var(--color-primary-dark, #2563eb) 0%, var(--color-primary, #3b82f6) 100%)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, var(--color-primary-dark, #2563eb) 100%)`;
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Started Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <Link
              href="/login"
              className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl font-bold text-base sm:text-lg border-2 border-gray-200 hover:border-primary-300 hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl hover-lift"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
          <div className="bg-white/80 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover-lift animate-fade-in-up group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300" style={{background: `linear-gradient(135deg, var(--color-secondary, #06b6d4) 0%, var(--color-accent, #8b5cf6) 100%)`}}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{color: 'var(--color-text, #1f2937)'}}>Simple Tracking</h3>
            <p className="text-sm sm:text-base leading-relaxed" style={{color: 'var(--color-textSecondary, #6b7280)'}}>Track single or multi-step habits with a clean, intuitive interface designed for daily use</p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover-lift animate-fade-in-up animation-delay-200 group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300" style={{background: `linear-gradient(135deg, var(--color-success, #10b981) 0%, var(--color-primary, #3b82f6) 100%)`}}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{color: 'var(--color-text, #1f2937)'}}>Progress Analytics</h3>
            <p className="text-sm sm:text-base leading-relaxed" style={{color: 'var(--color-textSecondary, #6b7280)'}}>Visualize your progress with beautiful charts, streaks, and detailed analytics</p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover-lift animate-fade-in-up animation-delay-400 group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300" style={{background: `linear-gradient(135deg, var(--color-accent, #8b5cf6) 0%, var(--color-warning, #f59e0b) 100%)`}}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{color: 'var(--color-text, #1f2937)'}}>Achievements</h3>
            <p className="text-sm sm:text-base leading-relaxed" style={{color: 'var(--color-textSecondary, #6b7280)'}}>Unlock badges and milestones as you build consistency and reach your goals</p>
          </div>
        </div>
      </div>
    </div>
  );
}
