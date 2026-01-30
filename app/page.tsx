'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Sparkles, CheckCircle2, BarChart3, Trophy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-black dark:text-white selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
              <Sparkles size={14} className="text-black dark:text-blue-400" />
              Elite Performance Protocol
            </div>
            
            <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.8] uppercase">
              Build Your<br />
              <span className="text-slate-200 dark:text-slate-800">Legacy.</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              The high-performance habit tracker for those who demand excellence. 
              Track protocols, secure streaks, and master your daily routine.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link
                href="/register"
                className="group w-full sm:w-auto bg-black dark:bg-blue-600 text-white px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-2xl shadow-black/20 dark:shadow-blue-500/20 flex items-center justify-center gap-3"
              >
                Get Started
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-black dark:text-white px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Decorative Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full h-full opacity-[0.03] dark:opacity-[0.07] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black dark:from-blue-500 via-transparent to-transparent"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 border-t border-slate-50 dark:border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16">
            {[
              {
                icon: CheckCircle2,
                title: "Precision Tracking",
                desc: "Single and multi-step protocols designed for operational efficiency."
              },
              {
                icon: BarChart3,
                title: "Advanced Biometrics",
                desc: "High-contrast analytics to visualize your performance velocity."
              },
              {
                icon: Trophy,
                title: "Elite Milestones",
                desc: "Secure streaks and unlock achievements as you master your discipline."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-6 group"
              >
                <div className="w-16 h-16 bg-black dark:bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-black/10 dark:shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <feature.icon size={28} className="text-white" />
                </div>
                <h3 className="text-2xl font-black tracking-tight uppercase dark:text-white">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof/Footer-ish section */}
      <section className="py-32 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <div className="inline-flex items-center gap-3">
            <div className="bg-black dark:bg-blue-600 p-2 rounded-xl">
              <Shield className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter dark:text-white">ELITE TRACKER</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none uppercase max-w-2xl mx-auto dark:text-white">
            Ready to join the<br />
            <span className="text-slate-400 dark:text-slate-600">Top 1%.</span>
          </h2>
          <Link
            href="/register"
            className="inline-flex items-center gap-3 text-sm font-black tracking-[0.2em] uppercase group dark:text-slate-300"
          >
            Create Your Account
            <div className="w-10 h-10 bg-black dark:bg-blue-600 rounded-full flex items-center justify-center text-white group-hover:translate-x-2 transition-transform">
              <ChevronRight size={18} />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
