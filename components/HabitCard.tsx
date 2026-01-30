'use client';

import { Habit } from '@/types';
import { CheckCircle2, Heart, Brain, Dumbbell, Utensils, Briefcase, ChevronDown, ChevronUp, Target, Flame, Zap, Clock } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  stepCompleted?: number[];
  onToggle: (habitId: string, stepIndex?: number) => void;
}

export default function HabitCard({ habit, completed, stepCompleted = [], onToggle }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);

  const allStepsCompleted = habit.type === 'multi-step' && 
    habit.steps.every((_, idx) => stepCompleted.includes(idx));

  const isFullyDone = completed || allStepsCompleted;

  const getIcon = () => {
    const props = { size: 24, className: isFullyDone ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' };
    switch (habit.category) {
      case 'Health': return <Heart {...props} />;
      case 'Productivity': return <Briefcase {...props} />;
      case 'Mindfulness': return <Brain {...props} />;
      case 'Fitness': return <Dumbbell {...props} />;
      case 'Diet': return <Utensils {...props} />;
      default: return <Target {...props} />;
    }
  };

  return (
    <motion.div 
      layout
      className={`group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border-2 transition-all duration-500 ${
        isFullyDone 
          ? 'border-blue-100 dark:border-blue-900/30 bg-blue-50/10 dark:bg-blue-900/5' 
          : 'border-slate-100 dark:border-slate-800 hover:border-blue-500/20 dark:hover:border-blue-500/30 shadow-sm hover:shadow-2xl dark:shadow-none'
      }`}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => habit.type === 'single-step' ? onToggle(habit.id) : setExpanded(!expanded)}
            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 ${
              isFullyDone ? 'bg-blue-600 shadow-xl shadow-blue-500/20 rotate-6' : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'
            }`}
          >
            {getIcon()}
          </motion.button>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{habit.category}</span>
              {habit.type === 'multi-step' && (
                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-widest">
                  {stepCompleted.length}/{habit.steps.length} Phases
                </span>
              )}
            </div>
            <h3 className={`text-xl font-black tracking-tight transition-all duration-500 ${
              isFullyDone ? 'text-slate-300 dark:text-slate-700 line-through' : 'text-slate-900 dark:text-white'
            }`}>
              {habit.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-4">
             {habit.streak > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-500/10 dark:bg-orange-500/5 px-3 py-1 rounded-full">
                  <Flame size={12} className="text-orange-500 fill-orange-500" />
                  <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase">{habit.streak}d</span>
                </div>
              )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(habit.id)}
            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-700 ${
              isFullyDone 
                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                : 'border-slate-100 dark:border-slate-800 hover:border-blue-500/30 bg-white dark:bg-slate-900'
            }`}
          >
            {isFullyDone ? (
              <CheckCircle2 size={28} />
            ) : (
              <Zap size={24} className="text-slate-200 dark:text-slate-700 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            )}
          </motion.button>
          
          {habit.type === 'multi-step' && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {habit.type === 'multi-step' && expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">Phase Sequence</p>
              {habit.steps.map((step, idx) => {
                const isStepDone = stepCompleted.includes(idx);
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ x: 6 }}
                    onClick={() => onToggle(habit.id, idx)}
                    className={`w-full flex items-center gap-6 p-5 rounded-2xl transition-all text-left ${
                      isStepDone ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                      isStepDone ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}>
                      {isStepDone ? <CheckCircle2 size={20} /> : <span className="text-xs font-black text-slate-400">{idx + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className={`text-base font-black tracking-tight ${isStepDone ? 'text-slate-300 dark:text-slate-700 line-through' : 'text-slate-900 dark:text-white'}`}>
                        {step.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                         <Clock size={12} className="text-slate-400" />
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Phase</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
