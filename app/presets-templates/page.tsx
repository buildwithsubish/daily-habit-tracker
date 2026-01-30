'use client';

import { useState, useEffect } from 'react';
import { Zap, Download, Check, AlertCircle, Layout, ChevronRight, ArrowLeft, Star, Target, Flame, Crown, Trophy, Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Preset {
  _id: string;
  name: string;
  description?: string;
  type: string;
  category?: string;
  structure?: {
    habits: any[];
  };
  habitsCount?: number;
}

export default function PresetsTemplatesPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets-templates');
      const data = await res.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      setMessage({ type: 'error', text: 'Failed to load habit templates' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async (presetName: string, presetId: string) => {
    setApplyingId(presetId);
    try {
      const res = await fetch('/api/presets/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetName })
      });

      const data = await res.json();

      if (res.ok) {
        setAppliedId(presetId);
        setMessage({ type: 'success', text: data.message || 'Template applied successfully!' });

        setTimeout(() => {
          setAppliedId(null);
          setMessage(null);
          router.push('/dashboard');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to apply template' });
      }
    } catch (error) {
      console.error('Error applying preset:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setApplyingId(null);
    }
  };

  const categories = ['All', 'Health', 'Fitness', 'Productivity', 'Mindfulness', 'Growth'];
  const filteredPresets = activeCategory === 'All'
    ? presets
    : presets.filter(p => p.category === activeCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Health': return 'bg-green-500';
      case 'Fitness': return 'bg-orange-500';
      case 'Productivity': return 'bg-blue-500';
      case 'Mindfulness': return 'bg-purple-500';
      case 'Growth': return 'bg-yellow-500';
      default: return 'bg-slate-500';
    }
  };

  const getCategoryTextColor = (category: string) => {
    switch (category) {
      case 'Health': return 'text-green-600';
      case 'Fitness': return 'text-orange-600';
      case 'Productivity': return 'text-blue-600';
      case 'Mindfulness': return 'text-purple-600';
      case 'Growth': return 'text-yellow-600';
      default: return 'text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 border-t-2 border-b-2 border-blue-600 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="text-blue-600 animate-pulse" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-slate-900 dark:text-slate-100 selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 transition-all mb-12 shadow-sm group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Dashboard</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Crown size={12} />
              Habit Templates
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
              Start Building <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Better Habits.</span>
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
              Choose a proven template to jumpstart your habit journey. Simple, practical, and effective.
            </p>
          </motion.div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-16">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeCategory === cat
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl'
                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-32">
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 overflow-hidden"
            >
              <div className={`p-6 rounded-3xl border-2 flex items-center justify-between gap-4 font-bold ${
                message.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-600'
                  : 'bg-red-500/10 border-red-500/20 text-red-600'
              }`}>
                <div className="flex items-center gap-4">
                  {message.type === 'success' ? <Check className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                  {message.text}
                </div>
                <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100 transition-opacity">
                  <Layout size={18} className="rotate-45" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredPresets.length === 0 ? (
          <div className="text-center py-40 bg-white dark:bg-slate-900/50 rounded-[4rem] border border-slate-200 dark:border-slate-800">
            <Layout className="mx-auto text-slate-200 dark:text-slate-700 mb-8" size={64} />
            <h3 className="text-2xl font-bold mb-2">No templates found</h3>
            <p className="text-slate-500">We're crafting new templates for this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredPresets.map((preset, index) => (
              <motion.div
                key={preset._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-white dark:bg-slate-900 rounded-[3rem] p-12 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all duration-500 overflow-hidden"
              >
                {/* Decorative background */}
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Rocket size={120} className="rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-12">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-600/30 group-hover:scale-110 transition-transform duration-500">
                      <Zap size={32} />
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${getCategoryColor(preset.category || 'Health')} bg-opacity-20 ${getCategoryTextColor(preset.category || 'Health')}`}>
                        {preset.category || 'General'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-4xl font-black mb-4 tracking-tight group-hover:text-blue-600 transition-colors">
                    {preset.name}
                  </h3>
                  <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mb-12 flex-grow leading-relaxed">
                    {preset.description || `A simple and effective template for ${preset.name.toLowerCase()}.`}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-12 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-6 py-3 rounded-2xl flex-grow w-full sm:w-auto">
                      <Trophy className="text-blue-600" size={20} />
                      <span className="font-bold text-sm">
                        <span className="text-blue-600">{preset.habitsCount || preset.structure?.habits?.length || 0}</span> Habits
                      </span>
                    </div>

                    <button
                      onClick={() => handleApplyPreset(preset.name, preset._id)}
                      disabled={applyingId === preset._id || appliedId === preset._id}
                      className={`w-full sm:w-auto px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${
                        appliedId === preset._id
                          ? 'bg-green-500 text-white shadow-xl shadow-green-500/20'
                          : applyingId === preset._id
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white shadow-xl hover:shadow-2xl hover:shadow-blue-600/20'
                      }`}
                    >
                      {appliedId === preset._id ? (
                        <><Check size={20} /> Applied</>
                      ) : applyingId === preset._id ? (
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Start Template <ChevronRight size={18} /></>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Trust Banner */}
      <section className="bg-slate-900 py-24 px-4 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex justify-center gap-8 mb-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
             {/* Mock Partner Icons */}
             {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 rounded-xl bg-white/10" />)}
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-4">Join Thousands Building Better Habits</p>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Start small, stay consistent, <br /> and <span className="text-blue-500">watch yourself grow.</span>
          </h2>
        </div>
      </section>
    </div>
  );
}

