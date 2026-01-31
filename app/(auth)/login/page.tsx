'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MonkeyAvatar from '@/components/MonkeyAvatar';
import ButtonLoader from '@/components/ButtonLoader';

// Simple Canvas Confetti
const Confetti = ({ active }: { active: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: any[] = [];
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 5,
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][i],
        size: Math.random() * 5 + 5,
        rotation: Math.random() * 360
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.rotation += 5;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      });
      frame++;
      if (frame < 60) requestAnimationFrame(animate);
    };
    animate();
  }, [active]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50" width={400} height={400} />;
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [success, setSuccess] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persist email when going back from password step
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('login_email');
    if (savedEmail) {
      setIdentifier(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isTyping]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your email or username');
      return;
    }
    // Save email for persistence
    sessionStorage.setItem('login_email', identifier);
    setError('');
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsTyping(false);

    // Simulate real-world delay for animation
    const startTime = Date.now();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      // Ensure at least 1.5s for animation
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));

      if (response.ok) {
        setSuccess(true);
        // Clear saved email
        sessionStorage.removeItem('login_email');
        setTimeout(() => router.push('/dashboard'), 800);
      } else {
        setError(data.error || 'Login failed');
        setStep('password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setStep('password');
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setPassword('');
    setError('');
    setIsPasswordFocused(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-[#050505] relative overflow-hidden font-sans">
      <AnimatePresence>
        {success && <Confetti active={success} />}
      </AnimatePresence>

      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 blur-[120px] rounded-full animate-pulse-soft" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500 blur-[120px] rounded-full animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 sm:p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-3 h-1.5 rounded-full transition-all duration-300 ${step === 'email' ? 'w-8 bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`w-3 h-1.5 rounded-full transition-all duration-300 ${step === 'password' ? 'w-8 bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <MonkeyAvatar
                isPasswordVisible={showPassword}
                isPasswordFocused={isPasswordFocused}
                isTyping={isTyping}
                isError={!!error}
                isSuccess={success}
                size={140}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-3 leading-tight">
              {step === 'email' ? 'What\'s your email?' : 'Enter your password'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              {step === 'email' 
                ? 'We\'ll check if you have an account.' 
                : `Signing in as ${identifier || '...'}`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: [0, -10, 10, -10, 10, 0], opacity: 1 }}
                className="bg-red-500/10 text-red-600 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-red-500/20 mb-6"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onSubmit={handleEmailSubmit}
                className="space-y-6"
              >
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setIsTyping(true);
                      setError('');
                    }}
                    required
                    placeholder="name@example.com"
                    className="w-full px-6 py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-base"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/25 shadow-xl"
                >
                  Next
                  <ChevronRight size={18} />
                </motion.button>

                <p className="text-center mt-6">
                  <span className="text-slate-500 text-sm font-medium">New around here?</span>{' '}
                  <Link href="/register" className="text-blue-600 font-black text-sm hover:text-blue-700 transition-colors ml-1 uppercase tracking-widest text-[10px]">
                    SIGN UP
                  </Link>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="password-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onSubmit={handlePasswordSubmit}
                className="space-y-6"
              >
                {/* Back Button */}
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-sm font-medium mb-2 px-2"
                >
                  <ChevronLeft size={16} />
                  Back to email
                </button>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                    Secret Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setIsTyping(true);
                        setError('');
                      }}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      required
                      placeholder="••••••••"
                      className="w-full px-6 py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-base"
                      autoComplete="current-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || success}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/10 ${
                    success 
                      ? 'bg-emerald-500 text-white' 
                      : loading
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/25'
                  }`}
                >
                  {success ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                      <CheckCircle size={18} /> Logged In
                    </motion.div>
                  ) : (
                    <>
                      <ButtonLoader loading={loading} text="Log in" loadingText="Signing in..." />
                    </>
                  )}
                </motion.button>

                <p className="text-center mt-6">
                  <span className="text-slate-500 text-sm font-medium">New around here?</span>{' '}
                  <Link href="/register" className="text-blue-600 font-black text-sm hover:text-blue-700 transition-colors ml-1 uppercase tracking-widest text-[10px]">
                    SIGN UP
                  </Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

const CheckCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

