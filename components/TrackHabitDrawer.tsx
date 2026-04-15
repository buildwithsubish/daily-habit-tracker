'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, Calculator, Info, Sparkles, Heart, Brain, Dumbbell, Utensils, Briefcase, Target, TrendingUp, Users, Wallet } from 'lucide-react';
import { Habit, SubActivity, WorkoutData } from '@/types';
import { useIsMobile } from '@/hooks/use-responsive';
import WorkoutLogger from './WorkoutLogger';
import KcalCalculator from './KcalCalculator';
import { toast } from 'react-hot-toast';

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
  onConfirm: (note: string, subActivities?: SubActivity[], workoutData?: WorkoutData) => void;
  onCancel: () => void;
}

export default function TrackHabitDrawer({
  habit,
  onConfirm,
  onCancel,
}: TrackHabitDrawerProps) {
  const isMobile = useIsMobile();
  const [advancedMode, setAdvancedMode] = useState(habit.advancedMode || false);
  const [note, setNote] = useState('');
  const [subActivities, setSubActivities] = useState<SubActivity[]>(habit.subActivities || []);
  const [workoutData, setWorkoutData] = useState<WorkoutData | undefined>(undefined);
  const [goal, setGoal] = useState<'weight-loss' | 'maintain' | 'weight-gain'>('maintain');
  
  const categoryConfig = CATEGORIES[habit.category as CategoryKey] || CATEGORIES.Other;
  const isWorkout = habit.category === 'Fitness' || habit.name.toLowerCase().includes('gym') || habit.name.toLowerCase().includes('workout');

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
    let finalNote = note;
    
    // Auto-generate note from sub-activities if empty
    if (!finalNote && subActivities.length > 0) {
      finalNote = subActivities
        .filter(s => s.name && s.value)
        .map(s => `${s.name}: ${s.value}`)
        .join(' • ');
    }

    onConfirm(finalNote, subActivities, workoutData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-end p-0 sm:p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      
      <motion.div
        initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={`relative w-full ${isMobile ? 'h-[90vh] rounded-t-3xl' : 'max-w-md h-full rounded-l-3xl'} bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden`}
      >
        {isMobile && (
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-4 mb-2 shrink-0" />
        )}

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-${categoryConfig.color}-50 dark:bg-${categoryConfig.color}-500/10 flex items-center justify-center`}>
                <categoryConfig.icon size={24} className={`text-${categoryConfig.color}-600 dark:text-${categoryConfig.color}-400`} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Track Habit</h3>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{habit.name}</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={24} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">Deep Logging</p>
              <p className="text-xs text-slate-600 font-medium">Add measurements and activities</p>
            </div>
            <button
              onClick={() => setAdvancedMode(!advancedMode)}
              className={`w-12 h-7 rounded-full transition-all relative ${advancedMode ? 'bg-indigo-600 shadow-sm shadow-indigo-500/30' : 'bg-slate-200 dark:bg-slate-800'}`}
            >
              <motion.div
                animate={{ x: advancedMode ? 22 : 3 }}
                className="absolute top-1.5 left-1 w-4 h-4 bg-white rounded-full shadow-md"
              />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!advancedMode ? (
              <motion.div
                key="simple"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100">Quick Note</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="How did you feel?"
                      className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl py-4 px-6 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['Feeling Strong', 'Easy Session', 'Needed This', 'Crushed it'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setNote(opt)}
                      className={`px-4 py-3 text-sm font-bold border rounded-2xl transition-all ${
                        note === opt 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Workout Specifically */}
                {isWorkout && (
                  <WorkoutLogger 
                    goal={goal}
                    onUpdate={(data) => setWorkoutData(data)} 
                  />
                )}

                {/* Calorie Calculator for Diet/Fitness */}
                {(habit.category === 'Diet' || habit.category === 'Fitness') && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Nutrition Engine</h4>
                    <KcalCalculator 
                      onSave={async (data) => {
                        await fetch('/api/user/profile', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(data)
                        });
                        toast.success('Health profile updated');
                      }}
                    />
                  </div>
                )}

                {/* Custom Sub-Activities */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Metrics</h4>
                    <button
                      onClick={addSubActivity}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:brightness-110"
                    >
                      <Plus size={16} /> Add Custom
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {subActivities.map((sub, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <select
                          value={sub.type}
                          onChange={(e) => updateSubActivity(idx, 'type', e.target.value as any)}
                          className="bg-white dark:bg-slate-900 border-none rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 w-24 h-10 px-2"
                        >
                          <option value="text">Note</option>
                          <option value="kg">Weight (kg)</option>
                          <option value="reps">Reps</option>
                          <option value="duration">Time (min)</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Measurement name..."
                          value={sub.name}
                          onChange={(e) => updateSubActivity(idx, 'name', e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 h-10 px-3"
                        />
                        <input
                          type={sub.type === 'text' ? 'text' : 'number'}
                          placeholder="Value"
                          value={sub.value}
                          onChange={(e) => updateSubActivity(idx, 'value', e.target.value)}
                          className="w-20 bg-white dark:bg-slate-900 border-none rounded-xl text-sm font-bold text-center text-indigo-600 dark:text-indigo-400 h-10"
                        />
                        <button
                          onClick={() => removeSubActivity(idx)}
                          className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white !py-4 !rounded-2xl flex items-center justify-center gap-3 text-lg font-black shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Save size={22} strokeWidth={2.5} />
            Complete Now
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-4 py-2 text-sm font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
