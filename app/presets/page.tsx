'use client';

import { useState, useEffect } from 'react';
import { Zap, Check, AlertCircle, Layout, ChevronRight, ArrowLeft, Trophy, Rocket, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
// Decorative mascot component removed for a more premium, professional aesthetic.

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

export default function PresetsPage() {
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

  const categories = ['All', 'Fitness', 'Diet', 'Health', 'Productivity', 'Mindfulness', 'Growth'];
  const filteredPresets = activeCategory === 'All'
    ? presets
    : presets.filter(p => p.category === activeCategory);

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Health': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Fitness': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'Diet': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'Productivity': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Mindfulness': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'Growth': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#050505]">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
          }}
          className="w-16 h-16 border-t-2 border-blue-600 rounded-full mb-4"
        />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Loading Protocols...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Decorative component removed */}
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-20">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-indigo-600 transition-colors mb-6 group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Dashboard</span>
            </Link>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={24} className="text-white" />
              </div>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                Habit Protocols
              </h1>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium text-lg">
              Engineered routines for peak performance and well-being.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-wrap gap-2"
          >
            {categories.map((cat) => (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-500/30'
                    : 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl text-zinc-400 border-zinc-200/50 dark:border-zinc-800/50 hover:border-indigo-500/50'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-12 p-6 rounded-3xl border-2 flex items-center justify-between gap-4 font-black text-xs uppercase tracking-widest ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                  : 'bg-red-500/10 border-red-500/20 text-red-600'
              }`}
            >
              <div className="flex items-center gap-4">
                {message.type === 'success' ? <Check className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                {message.text}
              </div>
              <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100 transition-opacity">
                <Layout size={18} className="rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredPresets.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Layout className="text-indigo-500 dark:text-indigo-400" size={48} />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-widest text-zinc-400">No Protocols Available</h3>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredPresets.map((preset, index) => (
              <motion.div
                key={preset._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-10 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-indigo-500/50 transition-all duration-500 shadow-xl hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-500">
                      <Zap size={24} fill="currentColor" />
                    </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCategoryStyles(preset.category || 'Health')}`}>
                    {preset.category || 'General'}
                  </span>
                </div>

                  <h3 className="text-3xl font-bold mb-3 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {preset.name}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-10 leading-relaxed line-clamp-2">
                    {preset.description || `Optimized routines for ${preset.name.toLowerCase()}.`}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                        <Trophy size={16} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        <span className="text-zinc-900 dark:text-white">{preset.habitsCount || preset.structure?.habits?.length || 0}</span> Habits
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApplyPreset(preset.name, preset._id)}
                        disabled={applyingId === preset._id || appliedId === preset._id}
                        className={`px-6 py-3.5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                          appliedId === preset._id
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-xl shadow-emerald-500/30'
                            : applyingId === preset._id
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl shadow-lg shadow-indigo-500/30'
                        }`}
                      >
                        {appliedId === preset._id ? (
                          <><Check size={16} /> Activated</>
                        ) : applyingId === preset._id ? (
                          <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>Apply Protocol <ChevronRight size={14} /></>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
