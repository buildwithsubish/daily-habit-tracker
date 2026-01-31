'use client';

import { Habit } from '@/types';
import { CheckCircle2, Heart, Brain, Dumbbell, Utensils, Briefcase, ChevronDown, ChevronUp, Target, Flame, Zap, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CompletionCelebration from './CompletionCelebration';

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  stepCompleted?: number[];
  onToggle: (habitId: string, stepIndex?: number) => void;
}

export default function HabitCard({ habit, completed, stepCompleted = [], onToggle }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(completed);

  const allStepsCompleted = habit.type === 'multi-step' && 
    habit.steps.every((_, idx) => stepCompleted.includes(idx));

  const isFullyDone = completed || allStepsCompleted;
  
  // Trigger celebration when completion changes
  if (isFullyDone && !wasCompleted) {
    setWasCompleted(true);
    setShowCelebration(true);
  } else if (!isFullyDone && wasCompleted) {
    setWasCompleted(false);
  }
  
  const progress = habit.type === 'multi-step' 
    ? (stepCompleted.length / habit.steps.length) * 100 
    : isFullyDone ? 100 : 0;

  const getIcon = () => {
    const props = { size: 22, className: isFullyDone ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 group-hover:text-indigo-500 transition-colors duration-200' };
    switch (habit.category) {
      case 'Health': return <Heart {...props} />;
      case 'Productivity': return <Briefcase {...props} />;
      case 'Mindfulness': return <Brain {...props} />;
      case 'Fitness': return <Dumbbell {...props} />;
      case 'Diet': return <Utensils {...props} />;
      default: return <Target {...props} />;
    }
  };

  const handleToggle = (stepIndex?: number) => {
    const wasDone = stepIndex !== undefined 
      ? stepCompleted.includes(stepIndex)
      : completed;
    
    onToggle(habit.id, stepIndex);
    
    // Show celebration if completing (not uncompleting)
    if (!wasDone) {
      if (stepIndex !== undefined) {
        // Check if this completes all steps
        const newCompleted = [...stepCompleted, stepIndex];
        if (newCompleted.length === habit.steps.length) {
          setShowCelebration(true);
        }
      } else {
        setShowCelebration(true);
      }
    }
  };

  return (
    <>
      <CompletionCelebration 
        isVisible={showCelebration} 
        onComplete={() => setShowCelebration(false)}
      />
      
      <motion.div 
        layout
        className={`group relative overflow-hidden rounded-3xl transition-all duration-500 ${
          isFullyDone 
            ? 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/20 border-2 border-indigo-200/50 dark:border-indigo-900/30 shadow-lg shadow-indigo-500/10' 
            : 'bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 hover:border-indigo-300/50 dark:hover:border-indigo-700/30 hover:shadow-xl hover:shadow-indigo-500/5'
        }`}
        whileHover={!isFullyDone ? { y: -4, scale: 1.02 } : {}}
      >
        {/* Animated Background Glow */}
        {isFullyDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-pink-400/20 blur-2xl"
          />
        )}

        {/* Sparkle Particles */}
        {isFullyDone && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  opacity: 0,
                  scale: 0
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.25,
                  ease: "easeInOut"
                }}
                className="absolute"
              >
                <Sparkles size={12} className="text-indigo-400" />
              </motion.div>
            ))}
          </div>
        )}

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => habit.type === 'single-step' ? handleToggle() : setExpanded(!expanded)}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden ${
                  isFullyDone 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30' 
                    : 'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 group-hover:from-indigo-50 dark:group-hover:from-indigo-900/20'
                }`}
              >
                {isFullyDone && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute inset-0 bg-white/20 rounded-2xl"
                  />
                )}
                <div className="relative z-10">
                  {getIcon()}
                </div>
              </motion.button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    isFullyDone 
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {habit.category}
                  </span>
                  {habit.type === 'multi-step' && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full uppercase tracking-widest"
                    >
                      {stepCompleted.length}/{habit.steps.length}
                    </motion.span>
                  )}
                </div>
                <h3 className={`text-lg font-bold tracking-tight transition-all duration-300 ${
                  isFullyDone 
                    ? 'text-indigo-600 dark:text-indigo-400 line-through decoration-2' 
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {habit.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {habit.streak > 0 && !isFullyDone && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950/30 dark:to-red-950/30 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-900/50"
                >
                  <Flame size={14} className="text-orange-500 fill-orange-500" />
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{habit.streak}d</span>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.85 }}
                onClick={() => handleToggle()}
                className={`relative w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 overflow-hidden ${
                  isFullyDone 
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/40' 
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }`}
              >
                {isFullyDone ? (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: [1, 1.3, 1], rotate: 0 }}
                      transition={{ duration: 0.5, type: "spring" }}
                    >
                      <CheckCircle2 size={24} className="text-white" />
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1.5, 2, 0], opacity: [0.8, 0, 0] }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 bg-white rounded-2xl"
                    />
                  </>
                ) : (
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Zap size={20} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                  </motion.div>
                )}
              </motion.button>
              
              {habit.type === 'multi-step' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setExpanded(!expanded)}
                  className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </motion.button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {habit.type === 'multi-step' && (
            <div className="mb-4">
              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isFullyDone 
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' 
                      : 'bg-gradient-to-r from-indigo-400 to-purple-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Multi-Step Checklist */}
          <AnimatePresence>
            {habit.type === 'multi-step' && expanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  {habit.steps.map((step, idx) => {
                    const isStepDone = stepCompleted.includes(idx);
                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ x: 4, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggle(idx)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left relative overflow-hidden ${
                          isStepDone 
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-900/50' 
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-900/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                        }`}
                      >
                        {/* Animated Background */}
                        {isStepDone && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 via-purple-400/10 to-pink-400/10"
                          />
                        )}

                        {/* Checkbox */}
                        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${
                          isStepDone 
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500 shadow-lg shadow-indigo-500/30' 
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                        }`}>
                          <AnimatePresence mode="wait">
                            {isStepDone ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                              >
                                <CheckCircle2 size={20} className="text-white" />
                              </motion.div>
                            ) : (
                              <motion.span
                                key="number"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="text-xs font-bold text-zinc-400"
                              >
                                {idx + 1}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          
                          {/* Ripple Effect */}
                          {isStepDone && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0.8 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 0.6 }}
                              className="absolute inset-0 rounded-xl bg-white"
                            />
                          )}
                        </div>

                        {/* Step Text */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold transition-all duration-300 ${
                            isStepDone 
                              ? 'text-indigo-600 dark:text-indigo-400 line-through decoration-2' 
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}>
                            {step.name}
                          </div>
                        </div>

                        {/* Sparkle Icon */}
                        {isStepDone && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: "spring" }}
                          >
                            <Star size={16} className="text-yellow-400 fill-yellow-400" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Glow Effect */}
        {isFullyDone && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          />
        )}
      </motion.div>
    </>
  );
}
