'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Habit, DailyLog, SubActivity, WorkoutData } from '@/types';
import { useApp } from '@/context/AppContext';
import TrackHabitDrawer from './TrackHabitDrawer';
import WhatsAppAutomationDashboard from './WhatsAppAutomationDashboard';

import { useIsMobile } from '@/hooks/use-responsive';
import {
  CheckCircle2,
  Heart,
  Brain,
  Dumbbell,
  Utensils,
  Briefcase,
  Target,
  Flame,
  MessageCircle,
  ChevronDown,
  TrendingUp,
  Zap,
  Send,
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
  onToggle: (habitId: string, stepIndex?: number, activityNote?: string, subActivities?: any[]) => void;
  onSettingsSave: (habitId: string, settings: Partial<Habit>) => Promise<void>;
  userWhatsAppNumber?: string;
  userWhatsAppAutomation?: boolean;
  onGlobalWhatsAppToggle?: (enabled: boolean) => Promise<void>;
}


export default function UnifiedHabitList({
  habits,
  logs,
  selectedDate,
  onToggle,
  onSettingsSave,
  userWhatsAppNumber,
  userWhatsAppAutomation,
}: UnifiedHabitListProps) {
  const { advancedMode: globalAdvancedMode } = useApp();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [activityModal, setActivityModal] = useState<{ habit: Habit; stepIndex?: number } | null>(null);
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);

  const closeWhatsAppModal = useCallback(() => {
    setShowWhatsAppModal(false);
  }, []);

  const isWhatsAppGloballyReady = !!userWhatsAppNumber && !!userWhatsAppAutomation;

  const stats = useMemo(() => {
    const automatedHabits = habits.filter((h) => h.whatsappEnabled && isWhatsAppGloballyReady).length;
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
      messagesSent: automatedHabits * 3,
      habitsAutomated: automatedHabits,
      responseRate: automatedHabits > 0 ? 87 : 0,
      engagement: totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0,
      completedToday,
      totalHabits,
    };
  }, [habits, logs, selectedDate, isWhatsAppGloballyReady]);

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
    const isCompleted = stepIndex !== undefined
      ? getStepCompletions(habit.id).includes(stepIndex)
      : getHabitCompletion(habit.id);

    // If already completed, toggle it off (simple)
    if (isCompleted) {
      onToggle(habit.id, stepIndex);
      return;
    }

    // Streamlined logic: Only use drawer if it's multi-step OR logging is explicitly required OR advanced mode is on
    const needsDrawer = habit.type === 'multi-step' || habit.activityLoggingEnabled || habit.advancedMode;
    
    if (needsDrawer && (habit.type === 'single-step' || habit.advancedMode)) {
      setActivityModal({ habit, stepIndex });
    } else if (habit.type === 'multi-step' && stepIndex === undefined) {
      // If a multi-step habit is clicked on the main row, expand it instead of checking all
      setExpandedHabit(expandedHabit === habit.id ? null : habit.id);
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
      onToggle(activityModal.habit.id, activityModal.stepIndex, note, subActivities);
      // We could also save workoutData here if its persistence is implemented in the parent onToggle
      toast.success(`${activityModal.habit.name} tracked!`, { icon: '✅' });
      window.dispatchEvent(new CustomEvent('habit-refetch'));
      setActivityModal(null);
    }
  };

  const handleGlobalWhatsAppSave = async (number: string, enabled: boolean) => {
    const res = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappNumber: number, whatsappAutomation: enabled }),
    });
    if (!res.ok) throw new Error('Failed to save');

    if (enabled) {
      for (const habit of habits) {
        if (!habit.whatsappEnabled) {
          await onSettingsSave(habit.id, { whatsappEnabled: true });
        }
      }
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
        {activityModal && (
          <TrackHabitDrawer
            habit={activityModal.habit}
            onConfirm={handleActivityConfirm}
            onCancel={() => {
              onToggle(activityModal.habit.id, activityModal.stepIndex);
              setActivityModal(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* WhatsApp Dashboard */}
      <WhatsAppAutomationDashboard
        isOpen={showWhatsAppModal}
        onClose={closeWhatsAppModal}
        isAdmin={false}
      />

      {/* Habit List Card */}
      <div className="card !p-0 overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-emerald-600">{stats.completedToday}</span> of {stats.totalHabits} completed
            </p>
          </div>
          
          {/* WhatsApp Toggle */}
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isWhatsAppGloballyReady
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <MessageCircle size={13} />
            <span className="hidden sm:inline">
              {isWhatsAppGloballyReady ? 'Automation On' : 'WhatsApp'}
            </span>
          </button>
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
                {/* Main Row */}
                <div className="flex items-center gap-4 px-4 py-2.5 min-h-[48px]">
                  {/* Checkbox - First */}
                  <button
                    onClick={() => handleHabitToggle(habit)}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all duration-200 ${
                      isCompleted
                        ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                        : 'border-gray-300 dark:border-gray-700 group-hover:border-indigo-400'
                    } focus-ring`}
                  >
                    <AnimatePresence>
                      {isCompleted && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <CheckCircle2 size={12} strokeWidth={3} className="text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  {/* Icon - Second */}
                  <div className={`flex-shrink-0 flex items-center justify-center ${
                    isCompleted ? 'text-gray-300 dark:text-gray-700' : 'text-gray-400 group-hover:text-indigo-500'
                  }`}>
                    <CategoryIcon size={16} />
                  </div>

                  {/* Title - Third */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className={`text-sm font-medium transition-all duration-200 ${
                      isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {habit.name}
                    </span>
                    
                    {habit.streak > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isCompleted ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600'
                      }`}>
                        {habit.streak}d
                      </span>
                    )}

                    {isCompleted && activityNote && (
                      <span className="text-[11px] text-gray-400 font-medium hidden sm:inline-block">
                        • {activityNote}
                      </span>
                    )}
                  </div>

                  {/* Metadata/Action - Right */}
                  <div className="flex items-center gap-3">
                    {habit.type === 'multi-step' && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {stepCompleted.length}/{habit.steps.length}
                      </span>
                    )}

                    {habit.whatsappEnabled && isWhatsAppGloballyReady && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" title="WhatsApp Automation On" />
                    )}

                    {(habit.type === 'multi-step' || (isCompleted && activityNote)) && (
                      <button
                        onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
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
                      <div className="px-4 pb-4 ml-[56px] space-y-2">
                        {habit.type === 'multi-step' && habit.steps.map((step: any, idx: number) => {
                          const isStepDone = stepCompleted.includes(idx);
                          return (
                            <button
                              key={idx}
                              onClick={() => handleHabitToggle(habit, idx)}
                              className="w-full flex items-center gap-3 py-1.5 group/step transition-all"
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
          {isWhatsAppGloballyReady && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">WhatsApp Live</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
