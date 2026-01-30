'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ChevronRight, Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import MonkeyAvatar from '@/components/MonkeyAvatar';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  }, [password]);

  const strengthLabel = [
    { label: 'Unsafe', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Medium', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-blue-500' },
    { label: 'Very Strong', color: 'bg-green-500' },
  ][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fafafa] dark:bg-[#050505] relative overflow-hidden font-sans">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 blur-[120px] rounded-full animate-pulse-soft" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-500 blur-[120px] rounded-full animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full relative z-10 py-10"
      >
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 sm:p-12 shadow-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-slate-900 shadow-xl">
                 <UserPlus size={28} />
              </div>
            </div>
            <MonkeyAvatar
              isPasswordVisible={showPassword}
              isPasswordFocused={isPasswordFocused}
            />
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Create Account</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Start building better habits today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 text-red-600 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Choose a username"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    required
                    placeholder="Create a password"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password && (
                  <div className="mt-3 px-1">
                    <div className="flex gap-1.5 h-1.5 mb-2">
                      {[0, 1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-500 ${
                            step < passwordStrength ? strengthLabel.color : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        Strength: <span className={passwordStrength > 0 ? 'text-slate-900 dark:text-white' : ''}>{strengthLabel.label}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-2xl active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-3 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-10 text-center">
            <span className="text-slate-500 text-sm font-medium">Already have an account?</span>{' '}
            <Link href="/login" className="text-blue-600 font-black text-sm hover:text-blue-700 transition-colors ml-1 uppercase tracking-widest text-[10px]">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

