'use client';

import React, { useState, useEffect } from 'react';
import { Habit } from '@/types';
import { 
  Heart, 
  Brain, 
  Dumbbell, 
  Utensils, 
  Briefcase, 
  Target, 
  Flame, 
  Zap, 
  Sparkles, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  GripVertical, 
  ListChecks, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useHiddenMode } from '@/context/HiddenModeContext';

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  stepCompleted?: number[];
  onToggle: (habitId: string, stepIndex?: number) => void;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
  onToggleVisibility?: (habitId: string, hidden: boolean) => void;
  showOrderControls?: boolean;
  dragHandleProps?: Record<string, any>;
  isDragOverlay?: boolean;
}

export default function HabitCard({ 
  habit, 
  completed, 
  stepCompleted = [], 
  onToggle, 
  onEdit, 
  onDelete, 
  onToggleVisibility,
  showOrderControls = false,
  dragHandleProps,
  isDragOverlay = false,
}: HabitCardProps) {
  const { isHiddenMode } = useHiddenMode();
  const [expanded, setExpanded] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(completed);

  // Fast, instant click-based visibility toggle (5-second hold removed)
  const handleVisibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleVisibility?.(habit.id, !habit.hidden);
  };

  const allStepsCompleted = habit.type === 'multi-step' &&
    Array.isArray(habit.steps) &&
    habit.steps.length > 0 &&
    habit.steps.every((_, idx) => stepCompleted.includes(idx));

  const isFullyDone = completed || allStepsCompleted;

  useEffect(() => {
    if (isFullyDone && !wasCompleted) {
      setWasCompleted(true);
    } else if (!isFullyDone && wasCompleted) {
      setWasCompleted(false);
    }
  }, [isFullyDone, wasCompleted]);

  const getCategoryStyles = () => {
    switch (habit.category) {
      case 'Fitness':
        return {
          icon: Dumbbell,
          bg: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
          badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
        };
      case 'Health':
        return {
          icon: Heart,
          bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
          badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
        };
      case 'Productivity':
        return {
          icon: Briefcase,
          bg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
          badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
        };
      case 'Mindfulness':
        return {
          icon: Brain,
          bg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
          badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
        };
      default:
        return {
          icon: Target,
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30',
          badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
        };
    }
  };

  const { icon: CategoryIcon, bg: iconBgClass, badge: badgeClass } = getCategoryStyles();

  return (
    <motion.div
      initial={isDragOverlay ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
        isDragOverlay
          ? 'bg-white dark:bg-[#151824] border-indigo-500 shadow-2xl ring-2 ring-indigo-500/40'
          : isFullyDone
          ? 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800/70'
          : 'bg-white dark:bg-[#12141D] border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-indigo-500/40 shadow-sm hover:shadow-md'
      } ${habit.hidden && isHiddenMode ? 'opacity-50 grayscale-[0.4] hover:opacity-100 hover:grayscale-0 transition-all' : ''}`}
    >
      <div className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Drag Handle, Icon, Category & Title */}
          <div className="flex items-center gap-2 sm:gap-3.5 flex-1 min-w-0">
            {/* Left Drag Handle (::) */}
            {showOrderControls && dragHandleProps && (
              <div
                {...dragHandleProps}
                role="button"
                tabIndex={0}
                aria-label="Drag to reorder habit"
                title="Drag to reorder"
                className="touch-none cursor-grab active:cursor-grabbing flex h-8 w-6 sm:h-10 sm:w-7 items-center justify-center rounded-lg text-slate-300 hover:text-slate-700 dark:text-zinc-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors shrink-0 -ml-0.5 active:scale-95"
              >
                <GripVertical size={16} />
              </div>
            )}

            {/* Category Icon Badge */}
            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${iconBgClass}`}>
              <CategoryIcon size={18} />
            </div>

            {/* Habit Information */}
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full border ${badgeClass}`}>
                  {habit.category}
                </span>

                {habit.type === 'multi-step' && Array.isArray(habit.steps) && (
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700">
                    <ListChecks size={10} className="text-indigo-500" />
                    <span>{habit.steps.length} Tasks</span>
                  </span>
                )}

                {habit.streak > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40">
                    <Flame size={10} className="text-orange-500 fill-orange-500" />
                    <span>{habit.streak}d</span>
                  </span>
                )}

                {habit.hidden && isHiddenMode && (
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                    <EyeOff size={10} />
                    <span>Hidden</span>
                  </span>
                )}
              </div>

              <h3 className={`text-sm sm:text-base lg:text-lg font-bold tracking-tight truncate ${
                isFullyDone ? 'text-slate-400 dark:text-zinc-500 line-through' : 'text-slate-900 dark:text-white'
              }`}>
                {habit.name}
              </h3>

              {habit.description && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">
                  {habit.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick Expand Multi-Step Button */}
            {habit.type === 'multi-step' && Array.isArray(habit.steps) && habit.steps.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-label="Toggle steps"
                className="flex h-7 sm:h-8 items-center gap-1 px-2 rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-50 dark:bg-zinc-800/40 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors"
              >
                <span>Tasks</span>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}

            {/* Action Buttons: Edit, Hide, Delete */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 dark:bg-zinc-800/60 p-0.5 sm:p-1 rounded-xl border border-slate-200/70 dark:border-zinc-700/60">
              {/* Edit Button */}
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(habit); }}
                  aria-label="Edit habit"
                  title="Edit Habit"
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-zinc-700 transition-all active:scale-95 shadow-2xs"
                >
                  <Edit2 size={13} />
                </button>
              )}

              {/* Hide / Unhide Button (Fast click toggle) */}
              {onToggleVisibility && (
                <button
                  type="button"
                  onClick={handleVisibilityClick}
                  aria-label={habit.hidden ? 'Reveal habit' : 'Conceal habit'}
                  title={habit.hidden ? 'Click to Reveal' : 'Click to Conceal'}
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-all active:scale-95 ${
                    habit.hidden 
                      ? 'bg-amber-500 text-white shadow-2xs' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-zinc-700'
                  }`}
                >
                  {habit.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              )}

              {/* Delete Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(habit.id); }}
                  aria-label="Delete habit"
                  title="Delete Habit"
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-zinc-700 transition-all active:scale-95"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Summary / Checkbox toggle for habits without edit options */}
            {!onEdit && !onDelete && (
              <button
                type="button"
                onClick={() => onToggle(habit.id)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all ${
                  isFullyDone
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'border-slate-300 dark:border-zinc-700 hover:border-indigo-500'
                }`}
              >
                {isFullyDone && <CheckCircle2 size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Multi-Step Checklist Drawer */}
        <AnimatePresence>
          {expanded && habit.type === 'multi-step' && Array.isArray(habit.steps) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-2 overflow-hidden"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Checklist Items</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {habit.steps.map((step, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-zinc-800 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium truncate">{step.name || `Task ${idx + 1}`}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
