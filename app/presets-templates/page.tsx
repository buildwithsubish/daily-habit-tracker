'use client';

import { useState, useEffect } from 'react';
import { Zap, Download, Check, AlertCircle, Sparkles, Layout, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Preset {
  _id: string;
  name: string;
  description?: string;
  type: string;
  structure?: {
    habits: any[];
  };
}

export default function PresetsTemplatesPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={14} />
                Handpicked for You
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Quick Start</h1>
              <p className="text-slate-600 text-lg leading-relaxed">
                Start your journey today with these simple, proven routines. Pick one that fits your life!
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{presets.length} Routines</p>
                <p className="text-xs text-slate-500">Ready to start</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <Layout size={24} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Global Notifications */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className={`overflow-hidden rounded-2xl border ${
                message.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="p-4 flex items-center gap-3 font-semibold">
                {message.type === 'success' ? <Check size={20} className="text-green-500" /> : <AlertCircle size={20} className="text-red-500" />}
                {message.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {presets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
              <AlertCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No templates found</h3>
            <p className="text-slate-500">Check back later for new habit collections.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {presets.map((preset, index) => (
              <motion.div
                key={preset._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 border border-slate-100 flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                    <Zap size={28} />
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {preset.type}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {preset.name}
                </h3>
                
                <p className="text-slate-500 text-sm mb-8 flex-grow leading-relaxed">
                  {preset.description || `Optimized ${preset.name.toLowerCase()} designed for maximum performance and consistency.`}
                </p>

                <div className="space-y-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">Included Habits</span>
                    <span className="font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                      {preset.structure?.habits?.length || 0}
                    </span>
                  </div>

                  <button
                    onClick={() => handleApplyPreset(preset.name, preset._id)}
                    disabled={applyingId === preset._id || appliedId === preset._id}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
                      appliedId === preset._id
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : applyingId === preset._id
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg shadow-slate-900/10 hover:shadow-blue-500/20'
                    }`}
                  >
                    {appliedId === preset._id ? (
                      <><Check size={18} /> Ready to go!</>
                    ) : applyingId === preset._id ? (
                      <><div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Setting things up...</>
                    ) : (
                      <>
                        Add to my habits
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
