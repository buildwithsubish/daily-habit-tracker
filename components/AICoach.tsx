'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Dumbbell, Apple, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface AICoachData {
  healthTip: {
    message: string;
    type: string;
  };
  workoutSuggestion: string;
  dietSuggestion: string;
}

export default function AICoach() {
  const [data, setData] = useState<AICoachData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai-coach')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-3xl p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-2 bg-white/20 rounded-full w-24" />
              <div className="h-4 bg-white/30 rounded-full w-32" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-white/20 rounded-full w-full" />
            <div className="h-3 bg-white/20 rounded-full w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/10 border border-white/5 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 blur-[2px] animate-scan" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/20">
            <Sparkles size={20} className="text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-[0.2em] text-blue-400/60 uppercase">Always here for you</span>
            <h3 className="text-xl font-bold tracking-tight">Your AI Companion</h3>
          </div>
        </div>
        <div className="relative">
          <p className="text-slate-300 font-medium leading-relaxed">"{data.healthTip.message}"</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border-2 border-slate-50 rounded-2xl p-6 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Dumbbell size={18} />
            </div>
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">Movement</h3>
          </div>
          <p className="text-slate-700 font-bold text-sm leading-relaxed">{data.workoutSuggestion}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border-2 border-slate-50 rounded-2xl p-6 hover:border-green-500/30 hover:shadow-xl hover:shadow-green-500/5 transition-all group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-50 p-2 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Apple size={18} />
            </div>
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">Fuel</h3>
          </div>
          <p className="text-slate-700 font-bold text-sm leading-relaxed">{data.dietSuggestion}</p>
        </motion.div>
      </div>
    </div>
  );
}
