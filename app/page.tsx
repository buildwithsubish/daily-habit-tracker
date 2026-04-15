'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Sparkles, CheckCircle2, BarChart3, Trophy, ChevronRight, Target, Flame, ArrowRight, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandMark from '@/components/BrandMark';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: "easeOut" }
  })
} as any;

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100 selection:bg-indigo-500/30 transition-colors duration-500">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-800 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between max-w-6xl mx-auto px-6 py-6 sm:py-8">
        <BrandMark href="/" />
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-[14px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="hidden sm:flex items-center justify-center px-4 py-2 rounded-full bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 text-[13px] font-bold hover:opacity-90 transition-all shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24 sm:pt-24 sm:pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            <motion.div 
              custom={0} 
              variants={fadeUp} 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-8"
            >
              <Star size={12} fill="currentColor" />
              <span>Premium Journey</span>
            </motion.div>

            <motion.h1 
              custom={1} 
              variants={fadeUp} 
              className="text-[32px] sm:text-6xl md:text-7xl font-[800] tracking-tight leading-[1.1] text-slate-900 dark:text-white mb-6 sm:mb-8"
            >
              Master your time,
              <br />
              <span className="text-slate-400 dark:text-zinc-500 text-[24px] sm:text-[inherit]">one habit at a time.</span>
            </motion.h1>

            <motion.p 
              custom={2} 
              variants={fadeUp} 
              className="max-w-xl mx-auto text-[16px] sm:text-[18px] text-slate-500 dark:text-zinc-400 font-medium leading-relaxed mb-10"
            >
              The intelligent habit platform designed for high performance. 
              Built with the precision of Linear and the simplicity of Notion.
            </motion.p>

            <motion.div 
              custom={3} 
              variants={fadeUp} 
              className="flex flex-col items-center gap-4"
            >
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center h-12 px-10 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-[14px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
              >
                Start Free Forever
                <ChevronRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              
              <Link 
                href="/login" 
                className="text-[13px] font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Already have an account? <span className="underline decoration-indigo-500/30 underline-offset-4">Sign in</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Grid Features */}
      <section className="relative z-10 py-16 sm:py-24 px-6 border-t border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                icon: CheckCircle2,
                title: 'Atomic Habits',
                desc: 'Focus on small, repeatable actions that compound into massive results over time.',
                color: 'text-sky-500'
              },
              {
                icon: BarChart3,
                title: 'Deep Analytics',
                desc: 'Beautifully rendered charts and heatmaps that expose your behavioral patterns.',
                color: 'text-indigo-500'
              },
              {
                icon: Shield,
                title: 'Data Privacy',
                desc: 'Your routine is personal. We use top-tier encryption to keep your data exclusively yours.',
                color: 'text-emerald-500'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-start"
              >
                <div className={`p-2.5 rounded-xl bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-slate-100 dark:ring-zinc-800 mb-6 ${feature.color}`}>
                  <feature.icon size={22} />
                </div>
                <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-[14px] text-slate-500 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-12 sm:p-20 rounded-[2.5rem] bg-slate-900 dark:bg-zinc-900 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-[800] text-white tracking-tight mb-6">Ready to flow?</h2>
              <p className="text-zinc-400 text-[15px] sm:text-[17px] mb-10 max-w-sm mx-auto">Join a community of high-performers committed to better habits.</p>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-10 h-14 rounded-full bg-white text-slate-900 font-bold text-[15px] hover:bg-zinc-100 transition-colors"
              >
                Join DailyHabit Flow
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 dark:border-zinc-900 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <BrandMark href="/" />
          <div className="text-[12px] font-medium text-slate-400">
            © 2026 DailyHabit Flow. Designed for discipline.
          </div>
        </div>

      </footer>
    </div>
  );
}
