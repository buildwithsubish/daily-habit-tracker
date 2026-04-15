'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Plus, Trash2, Calculator, Info } from 'lucide-react';
import { WorkoutData, ExerciseEntry, ExerciseSet } from '@/types';

interface WorkoutLoggerProps {
  initialData?: WorkoutData;
  onUpdate: (data: WorkoutData) => void;
  goal?: 'weight-loss' | 'maintain' | 'weight-gain';
}

export default function WorkoutLogger({ initialData, onUpdate, goal = 'maintain' }: WorkoutLoggerProps) {
  const [exercises, setExercises] = useState<ExerciseEntry[]>(initialData?.exercises || [
    { name: '', sets: [{ completed: false, reps: 0, weight: 0 }] }
  ]);
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>(initialData?.intensity || 'medium');

  const updateExercises = (newExercises: ExerciseEntry[]) => {
    setExercises(newExercises);
    onUpdate({
      exercises: newExercises,
      intensity,
      goal,
      totalDuration: 45, // Default for now
      caloriesBurned: calculateCalories(newExercises, intensity)
    });
  };

  const calculateCalories = (exs: ExerciseEntry[], intens: string) => {
    const base = exs.length * 50;
    const multipliers = { low: 0.8, medium: 1.2, high: 1.6 };
    return Math.round(base * multipliers[intens as keyof typeof multipliers]);
  };

  const addExercise = () => {
    updateExercises([...exercises, { name: '', sets: [{ completed: false, reps: 0, weight: 0 }] }]);
  };

  const removeExercise = (idx: number) => {
    updateExercises(exercises.filter((_, i) => i !== idx));
  };

  const updateExerciseName = (idx: number, name: string) => {
    const newExs = [...exercises];
    newExs[idx].name = name;
    updateExercises(newExs);
  };

  const addSet = (exIdx: number) => {
    const newExs = [...exercises];
    const lastSet = newExs[exIdx].sets[newExs[exIdx].sets.length - 1];
    newExs[exIdx].sets.push({ 
      ...lastSet, 
      completed: false 
    });
    updateExercises(newExs);
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const newExs = [...exercises];
    newExs[exIdx].sets = newExs[exIdx].sets.filter((_, i) => i !== setIdx);
    updateExercises(newExs);
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof ExerciseSet, value: any) => {
    const newExs = [...exercises];
    newExs[exIdx].sets[setIdx] = { ...newExs[exIdx].sets[setIdx], [field]: value };
    updateExercises(newExs);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Dumbbell size={16} className="text-indigo-500" />
          Workout Exercises
        </h4>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {(['low', 'medium', 'high'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setIntensity(lvl)}
              className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${
                intensity === lvl 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map((ex, exIdx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={exIdx} 
            className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 group"
          >
            <div className="flex gap-2 items-center mb-3">
              <input
                type="text"
                value={ex.name}
                onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                placeholder="Exercise name (e.g. Squat)"
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 dark:text-slate-100 flex-1 p-0"
              />
              <button 
                onClick={() => removeExercise(exIdx)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                <span>Set</span>
                <span>kg</span>
                <span>Reps</span>
                <span className="text-right">Action</span>
              </div>
              
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className="grid grid-cols-4 gap-2 items-center">
                  <div className="h-8 flex items-center px-2 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                    {setIdx + 1}
                  </div>
                  <input
                    type="number"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                    className="h-8 input-modern !py-0 !px-2 text-xs text-center"
                    placeholder="0"
                  />
                  <input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                    className="h-8 input-modern !py-0 !px-2 text-xs text-center"
                    placeholder="0"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={() => removeSet(exIdx, setIdx)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => addSet(exIdx)}
                className="w-full py-1.5 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all uppercase tracking-widest"
              >
                + Add Set
              </button>
            </div>
          </motion.div>
        ))}

        <button
          onClick={addExercise}
          className="w-full py-3 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Add Exercise
        </button>
      </div>

      <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center">
          <Calculator size={18} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">Estimated Workout Burn</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
            {calculateCalories(exercises, intensity)} <span className="text-[10px] font-bold uppercase tracking-widest">Kcal</span>
          </p>
        </div>
      </div>
    </div>
  );
}
