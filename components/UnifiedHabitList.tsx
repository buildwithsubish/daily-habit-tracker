'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Habit, DailyLog, SubActivity, WorkoutData } from '@/types';
import { useApp } from '@/context/AppContext';
import TrackHabitDrawer from './TrackHabitDrawer';


import {
  CheckCircle2,
  Heart,
  Brain,
  Dumbbell,
  Utensils,
  Briefcase,
  Target,
  Flame,
  ChevronDown,
  TrendingUp,
  Zap,
  Users,
  Wallet,
  Sparkles,
  X,
  Clock,
  Activity,
  FileText,
  Plus,
  Trash2,
  Calculator,
  Save,
} from 'lucide-react';

// Predefined categories with their styling
const CATEGORIES = {
  Health: { icon: Heart, color: 'rose', gradient: 'from-rose-500 to-pink-500' },
  Fitness: { icon: Dumbbell, color: 'orange', gradient: 'from-orange-500 to-amber-500' },
  Productivity: { icon: Briefcase, color: 'blue', gradient: 'from-blue-500 to-indigo-500' },
  Mindfulness: { icon: Brain, color: 'purple', gradient: 'from-purple-500 to-violet-500' },
  Growth: { icon: TrendingUp, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
  Diet: { icon: Utensils, color: 'amber', gradient: 'from-amber-500 to-yellow-500' },
  Finance: { icon: Wallet, color: 'green', gradient: 'from-green-500 to-emerald-500' },
  Social: { icon: Users, color: 'cyan', gradient: 'from-cyan-500 to-sky-500' },
  Other: { icon: Target, color: 'slate', gradient: 'from-slate-500 to-zinc-500' },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

interface UnifiedHabitListProps {
  habits: Habit[];
  logs: DailyLog[];
  selectedDate: string;
  onToggle: (habitId: string, stepIndex?: number, activityNote?: string, subActivities?: SubActivity[], workoutData?: WorkoutData) => void;
  readOnly?: boolean;
}


export default function UnifiedHabitList({
  habits,
  logs,
  selectedDate,
  onToggle,
  readOnly = false,
}: UnifiedHabitListProps) {
  const { advancedMode: globalAdvancedMode } = useApp();
  const [activityModal, setActivityModal] = useState<{ habit: Habit; stepIndex?: number } | null>(null);
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalHabits = habits.length;
    const completedToday = habits.filter((h) => {
      if (h.type === 'single-step') {
        return logs.some(
          (l) => l.habitId === h.id && l.date === selectedDate && l.completed && (l.stepIndex === null || l.stepIndex === undefined)
        );
      } else {
        const completedSteps = logs.filter(
          (l) => l.habitId === h.id && l.date === selectedDate && l.completed && l.stepIndex !== null && l.stepIndex !== undefined
        ).length;
        return completedSteps === h.steps.length;
      }
    }).length;

    return {
      completedToday,
      totalHabits,
    };
  }, [habits, logs, selectedDate]);

  const getActivityNote = (habitId: string) => {
    const log = logs.find(
      (l) => l.habitId === habitId && l.date === selectedDate && l.completed && (l.stepIndex === null || l.stepIndex === undefined)
    );
    if (!log) return null;
    
    if (log.activityNote) return log.activityNote;
    
    if (log.subActivities && log.subActivities.length > 0) {
      return log.subActivities
        .map((s: SubActivity) => `${s.name}: ${s.value}`)
        .join(' • ');
    }
    
    return log.dynamicSteps?.[0]?.name || null;
  };

  const getHabitCompletion = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return false;

    if (habit.type === 'single-step') {
      const log = logs.find(
        (l) => l.habitId === habitId && l.date === selectedDate && (l.stepIndex === null || l.stepIndex === undefined)
      );
      return log?.completed || false;
    } else {
      const completedSteps = logs.filter(
        (l) => l.habitId === habitId && l.date === selectedDate && l.completed && l.stepIndex !== null && l.stepIndex !== undefined
      ).length;
      return completedSteps === habit.steps.length;
    }
  };

  const getStepCompletions = (habitId: string) => {
    return logs
      .filter((l) => l.habitId === habitId && l.date === selectedDate && l.completed && l.stepIndex !== null && l.stepIndex !== undefined)
      .map((l) => l.stepIndex as number)
      .sort((a, b) => a - b);
  };

  const handleHabitToggle = (habit: Habit, stepIndex?: number) => {
    if (readOnly && (habit.type === 'single-step' || stepIndex !== undefined)) return;
    const isCompleted = stepIndex !== undefined
      ? getStepCompletions(habit.id).includes(stepIndex)
      : getHabitCompletion(habit.id);

    // If already completed, toggle it off (simple)
    if (isCompleted) {
      onToggle(habit.id, stepIndex);
      return;
    }

    // Step based habits expand from their main row; a step tap can open deep logging.
    if (habit.type !== 'single-step' && stepIndex === undefined) {
      setExpandedHabit(expandedHabit === habit.id ? null : habit.id);
    } else if (habit.activityLoggingEnabled || habit.advancedMode || globalAdvancedMode) {
      setActivityModal({ habit, stepIndex });
    } else {
      // Simple toggling for single-step habits
      onToggle(habit.id, stepIndex);
      window.dispatchEvent(new CustomEvent('habit-refetch'));
      if (!isCompleted) {
        toast.success(`${habit.name} complete!`, {
          icon: '✨',
          style: {
            borderRadius: '16px',
            background: 'rgba(15, 15, 25, 0.95)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '600',
          },
        });
      }
    }
  };

  const handleActivityConfirm = (note: string, subActivities?: SubActivity[], workoutData?: WorkoutData) => {
    if (activityModal) {
      onToggle(activityModal.habit.id, activityModal.stepIndex, note, subActivities, workoutData);
      toast.success(`${activityModal.habit.name} tracked!`, { icon: '✅' });
      window.dispatchEvent(new CustomEvent('habit-refetch'));
      setActivityModal(null);
    }
  };

  if (habits.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Sparkles size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500 mb-1">No habits scheduled</p>
        <p className="text-xs text-slate-400">Start building your daily rituals</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Track Habit Drawer */}
      <AnimatePresence>
        {activityModal && !readOnly && (
          <TrackHabitDrawer
            habit={activityModal.habit}
            initialAdvancedMode={globalAdvancedMode}
            onConfirm={handleActivityConfirm}
            onCancel={() => setActivityModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Habit List Card */}
      <div className="card !p-0 overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-emerald-600">{stats.completedToday}</span> of {stats.totalHabits} completed
            </p>
          </div>
        </div>

        {/* Habit Rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {habits.map((habit, index) => {
            const isCompleted = getHabitCompletion(habit.id);
            const stepCompleted = getStepCompletions(habit.id);
            const categoryConfig = CATEGORIES[habit.category as CategoryKey] || CATEGORIES.Other;
            const CategoryIcon = categoryConfig.icon;
            const activityNote = getActivityNote(habit.id);
            const isExpanded = expandedHabit === habit.id;

            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="px-3 py-1.5"
              >
                <div
                  className={`group relative flex flex-col transition-all duration-300 rounded-2xl border ${
                    isCompleted 
                      ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-transparent opacity-70' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
                  }`}
                >
                {/* The primary row is one large, keyboard-operable completion target. */}
                <div className="flex items-stretch gap-1 sm:gap-2 p-1.5 sm:p-2">
                  <button
                    type="button"
                    onClick={() => handleHabitToggle(habit)}
                    disabled={readOnly && habit.type === 'single-step'}
                    title={readOnly && habit.type === 'single-step' ? 'This date is read-only' : undefined}
                    aria-label={habit.type === 'multi-step'
                      ? `${isExpanded ? 'Collapse' : 'Open'} ${habit.name} checklist`
                      : `${isCompleted ? 'Mark' : 'Complete'} ${habit.name}${isCompleted ? ' incomplete' : ' habit'}`}
                    aria-pressed={habit.type === 'single-step' ? isCompleted : undefined}
                    className={`flex min-h-11 min-w-0 flex-1 select-none items-center gap-2.5 sm:gap-4 rounded-xl px-2.5 sm:px-3 text-left transition-colors duration-150 touch-manipulation active:bg-indigo-50/70 dark:active:bg-indigo-950/30 focus-ring ${
                      isCompleted ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {/* Checkbox indicator */}
                    <span aria-hidden="true" className={`flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all duration-200 ${
                      isCompleted
                        ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                        : 'border-gray-300 dark:border-gray-700 group-hover:border-indigo-400'
                    }`}
                  >
                    <AnimatePresence>
                      {isCompleted && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <CheckCircle2 size={12} strokeWidth={3} className="text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    </span>

                    {/* Category icon */}
                    <span aria-hidden="true" className={`flex-shrink-0 flex items-center justify-center ${
                    isCompleted ? 'text-gray-300 dark:text-gray-700' : 'text-gray-400 group-hover:text-indigo-500'
                  }`}>
                    <CategoryIcon size={16} />
                    </span>

                    {/* Title and optional metadata */}
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 sm:gap-3">
                      <span className={`min-w-0 break-words text-sm font-medium leading-snug transition-all duration-200 ${
                      isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {habit.name}
                      </span>
                    
                    {habit.streak > 0 && (
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isCompleted ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600'
                      }`}>
                        {habit.streak}d
                      </span>
                    )}

                      {isCompleted && activityNote && (
                      <span className="w-full truncate text-[11px] text-gray-400 font-medium sm:w-auto sm:inline-block">
                        • {activityNote}
                      </span>
                    )}
                    </span>
                  </button>

                  {/* Keep expansion independent from completion. */}
                  <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    {habit.type === 'multi-step' && (
                      <span className="px-0.5 text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:tracking-widest">
                        {stepCompleted.length}/{habit.steps.length}
                      </span>
                    )}

                    {(habit.type === 'multi-step' || (isCompleted && activityNote)) && (
                      <button
                        type="button"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${habit.name}`}
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                        className={`touch-target rounded-lg transition-colors focus-ring ${
                          isExpanded ? 'bg-gray-100 dark:bg-gray-800 text-gray-900' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-gray-50/30 dark:bg-gray-900/10"
                    >
                      <div className="space-y-2 px-3 pb-4 pl-12 sm:px-4 sm:pb-4 sm:pl-[4.5rem]">
                        {habit.type === 'multi-step' && habit.steps.map((step: any, idx: number) => {
                          const isStepDone = stepCompleted.includes(idx);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleHabitToggle(habit, idx)}
                              disabled={readOnly}
                              title={readOnly ? 'This date is read-only' : undefined}
                              aria-pressed={isStepDone}
                              className="group/step flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-indigo-50/70 active:bg-indigo-100/70 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-indigo-950/30 dark:active:bg-indigo-900/40 focus-ring touch-manipulation"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isStepDone ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-700'
                              }`}>
                                {isStepDone && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                              </div>
                              <span className={`text-xs font-medium ${
                                isStepDone ? 'text-gray-400 line-through' : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {step.name}
                              </span>
                            </button>
                          );
                        })}

                        {isCompleted && activityNote && habit.type === 'single-step' && (
                          <div className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Observation</p>
                            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{activityNote}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

        {/* Minimalist Footer */}
        <div className="px-4 py-3 bg-gray-50/30 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {stats.completedToday} OF {stats.totalHabits} RITUALS COMPLETE
          </p>
        </div>
      </div>
    </div>
  );
}
