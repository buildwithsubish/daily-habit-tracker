'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ButtonLoader from '@/components/ButtonLoader';
import BrandMark from '@/components/BrandMark';


export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');
    
    let isValid = true;

    if (!identifier.trim()) {
      setEmailError('Email or username is required');
      isValid = false;
    } else {
      const isEmail = identifier.includes('@');
      if (isEmail && !validateEmail(identifier)) {
        setEmailError('Please enter a valid email address');
        isValid = false;
      }
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Glassmorphism Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-slate-900/10 dark:shadow-black/50 overflow-hidden"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 pointer-events-none" />
          
          <div className="relative p-8 sm:p-10 lg:p-12">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-8 flex flex-col items-center"
            >
              <div className="mb-6">
                <BrandMark href="/" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium">
                Sign in to continue tracking your habits
              </p>
            </motion.div>


            {/* Error Message */}
            <AnimatePresence mode="wait">
              {(error || emailError || passwordError) && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium flex-1">
                    {error || emailError || passwordError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Email Input */}
              <div className="space-y-2">
                <label
                  htmlFor="identifier"
                  className={`block text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors ${
                    isEmailFocused ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setEmailError('');
                      setError('');
                    }}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    required
                    placeholder="name@example.com"
                    className={`w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 rounded-xl outline-none transition-all duration-200 font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      emailError
                        ? 'border-red-300 dark:border-red-800 focus:border-red-500 dark:focus:border-red-600'
                        : isEmailFocused
                        ? 'border-blue-500 dark:border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className={`block text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors ${
                    isPasswordFocused ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                      setError('');
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    required
                    placeholder="Enter your password"
                    className={`w-full pl-12 pr-12 py-3.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 rounded-xl outline-none transition-all duration-200 font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      passwordError
                        ? 'border-red-300 dark:border-red-800 focus:border-red-500 dark:focus:border-red-600'
                        : isPasswordFocused
                        ? 'border-blue-500 dark:border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading || success}
                whileHover={!loading && !success ? { scale: 1.02, y: -2 } : {}}
                whileTap={!loading && !success ? { scale: 0.98 } : {}}
                className={`w-full py-3.5 px-6 font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  success
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/30'
                    : loading
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 cursor-wait'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30 dark:shadow-blue-500/20'
                }`}
              >
                {success ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Signed In</span>
                  </motion.div>
                ) : (
                  <ButtonLoader loading={loading} text="Sign In" loadingText="Signing in..." />
                )}
              </motion.button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-4">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </motion.form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
