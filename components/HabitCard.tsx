'use client';

import { Habit } from '@/types';
import { CheckCircle2, Heart, Brain, Dumbbell, Utensils, Briefcase, ChevronDown, ChevronUp, Target, Flame } from 'lucide-react';
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
    const props = { size: 20, className: isFullyDone ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 transition-colors' };
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative bg-white rounded-[2rem] p-5 border-2 transition-all duration-500 ${
        isFullyDone 
          ? 'border-blue-50 bg-blue-50/20' 
          : 'border-slate-50 hover:border-blue-500/10 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => habit.type === 'single-step' ? onToggle(habit.id) : setExpanded(!expanded)}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-700 ${
              isFullyDone ? 'bg-blue-600 shadow-lg shadow-blue-500/20 rotate-[10deg]' : 'bg-slate-50 group-hover:bg-blue-50'
            }`}
          >
            {getIcon()}
          </motion.button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{habit.category}</span>
              {habit.type === 'multi-step' && (
                <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {stepCompleted.length}/{habit.steps.length} Done
                </span>
              )}
              {habit.streak > 0 && (
                <div className="flex items-center gap-0.5 bg-orange-50 px-2 py-0.5 rounded-full">
                  <Flame size={10} className="text-orange-500 fill-orange-500" />
                  <span className="text-[9px] font-black text-orange-600 uppercase">{habit.streak} day streak!</span>
                </div>
              )}
            </div>
            <h3 className={`text-lg font-black tracking-tight transition-all duration-500 ${
              isFullyDone ? 'text-slate-300 line-through' : 'text-slate-900'
            }`}>
              {habit.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {habit.type === 'multi-step' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setExpanded(!expanded)}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggle(habit.id)}
            className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-700 ${
              isFullyDone 
                ? 'bg-blue-600 border-blue-600 text-white rotate-6 shadow-xl shadow-blue-500/20' 
                : 'border-slate-100 hover:border-blue-500/10 bg-slate-50'
            }`}
          >
            {isFullyDone ? (
              <CheckCircle2 size={24} />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:bg-blue-600 transition-all duration-500" />
            )}
          </motion.button>
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
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
              {habit.steps.map((step, idx) => {
                const isStepDone = stepCompleted.includes(idx);
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ x: 4 }}
                    onClick={() => onToggle(habit.id, idx)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50/50 transition-all text-left group/step"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                      isStepDone ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10' : 'border-slate-100 bg-white group-hover/step:border-blue-500/20'
                    }`}>
                      {isStepDone ? <CheckCircle2 size={16} /> : <span className="text-xs font-black text-slate-400">{idx + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm font-black tracking-tight ${isStepDone ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                        {step.name}
                      </span>
                      {step.duration && (
                        <span className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{step.duration} min</span>
                      )}
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
