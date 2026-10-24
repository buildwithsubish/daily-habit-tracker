'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Heart, 
  Brain, 
  Dumbbell, 
  Utensils, 
  Briefcase, 
  Target, 
  TrendingUp, 
  Users, 
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { Habit, SubActivity, WorkoutData } from '@/types';
import { useIsMobile } from '@/hooks/use-responsive';

const CATEGORIES = {
  Health: { icon: Heart, color: 'rose' },
  Fitness: { icon: Dumbbell, color: 'orange' },
  Productivity: { icon: Briefcase, color: 'blue' },
  Mindfulness: { icon: Brain, color: 'purple' },
  Growth: { icon: TrendingUp, color: 'emerald' },
  Diet: { icon: Utensils, color: 'amber' },
  Finance: { icon: Wallet, color: 'green' },
  Social: { icon: Users, color: 'cyan' },
  Other: { icon: Target, color: 'slate' },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

interface TrackHabitDrawerProps {
  habit: Habit;
  initialAdvancedMode?: boolean;
  selectedDate?: string;
  onConfirm: (note: string, subActivities?: SubActivity[], workoutData?: WorkoutData) => void;
  onCancel: () => void;
}

export default function TrackHabitDrawer({
  habit,
  initialAdvancedMode = false,
  selectedDate = new Date().toISOString().split('T')[0],
  onConfirm,
  onCancel,
}: TrackHabitDrawerProps) {
  const isMobile = useIsMobile();
  const [note, setNote] = useState('');
  const [subActivities, setSubActivities] = useState<SubActivity[]>(habit.subActivities || []);

  const categoryConfig = CATEGORIES[habit.category as CategoryKey] || CATEGORIES.Other;

  const addSubActivity = () => {
    setSubActivities([...subActivities, { name: '', type: 'text', value: '' }]);
  };

  const updateSubActivity = (index: number, field: keyof SubActivity, value: any) => {
    const updated = [...subActivities];
    updated[index] = { ...updated[index], [field]: value };
    setSubActivities(updated);
  };

  const removeSubActivity = (index: number) => {
    setSubActivities(subActivities.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    let finalNote = note.trim();

    const finalSubActivities: SubActivity[] = subActivities
      .filter(s => s && typeof s.name === 'string' && s.name.trim().length > 0)
      .map(s => ({
        name: s.name.trim(),
        type: (['text', 'number', 'reps', 'duration', 'kg'].includes(s.type) ? s.type : 'text') as SubActivity['type'],
        value: s.value !== undefined && s.value !== null ? String(s.value) : '',
      }));

    if (!finalNote && finalSubActivities.length > 0) {
      const parts = finalSubActivities
        .filter(s => s.value !== undefined && s.value !== null && String(s.value).trim() !== '')
        .map(s => `${s.name}: ${s.value}`);
      if (parts.length > 0) {
        finalNote = parts.join(' • ');
      }
    }

    onConfirm(finalNote, finalSubActivities);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-end p-0 sm:p-4"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      
      <motion.div
        initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={`relative w-full ${isMobile ? 'h-[85vh] rounded-t-3xl' : 'max-w-md h-full rounded-l-3xl'} bg-white dark:bg-[#12141D] shadow-2xl flex flex-col overflow-hidden border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-white/[0.08]`}
      >
        {isMobile && (
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto mt-4 mb-2 shrink-0" />
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center">
                <categoryConfig.icon size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  Track Habit
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider truncate">{habit.name}</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 pb-28">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-900 dark:text-white">Quick Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="How did this session feel?"
                className="w-full bg-slate-100 dark:bg-zinc-800/60 border border-transparent dark:border-zinc-700/60 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {['Feeling Strong', 'Easy Session', 'Needed This', 'Crushed it'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNote(opt)}
                  className={`px-3 py-2.5 text-xs font-bold border rounded-xl transition-all ${
                    note === opt 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/50 shadow-xs' 
                      : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Optional Custom Subactivities / Metrics */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Custom Metrics (Optional)</h4>
                <button
                  type="button"
                  onClick={addSubActivity}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:brightness-110"
                >
                  <Plus size={14} /> Add Metric
                </button>
              </div>
              
              {subActivities.map((sub, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-zinc-800/40 p-2 rounded-xl border border-slate-200/70 dark:border-zinc-700/60">
                  <input
                    type="text"
                    placeholder="Metric name (e.g. Pages, Mins)..."
                    value={sub.name}
                    onChange={(e) => updateSubActivity(idx, 'name', e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white h-9 px-3 outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={sub.value}
                    onChange={(e) => updateSubActivity(idx, 'value', e.target.value)}
                    className="w-20 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-lg text-xs font-bold text-center text-indigo-600 dark:text-indigo-400 h-9 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSubActivity(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with iOS safe area handling */}
        <div className="p-4 sm:p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#12141D] shrink-0">
          <button
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white !py-3.5 !rounded-2xl flex items-center justify-center gap-2 text-base font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Save size={18} strokeWidth={2.5} />
            <span>Complete & Save</span>
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-2.5 py-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}