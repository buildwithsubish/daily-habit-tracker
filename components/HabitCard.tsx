'use client';

import { Habit } from '@/types';
import { CheckCircle2, Heart, Brain, Dumbbell, Utensils, Briefcase, ChevronDown, ChevronUp, Target, Flame, Zap, Sparkles, Star, MessageCircle, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import WhatsAppSettingsModal from './WhatsAppSettingsModal';
import { useHiddenMode } from '@/context/HiddenModeContext';

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  stepCompleted?: number[];
  onToggle: (habitId: string, stepIndex?: number) => void;
  userWhatsAppNumber?: string;
  userWhatsAppAutomation?: boolean;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
  onToggleVisibility?: (habitId: string, hidden: boolean) => void;
}

export default function HabitCard({ habit, completed, stepCompleted = [], onToggle, onSettingsSave, userWhatsAppNumber, userWhatsAppAutomation, onEdit, onDelete, onToggleVisibility }: HabitCardProps & { onSettingsSave?: (id: string, settings: Partial<Habit>) => void }) {
  const { isHiddenMode } = useHiddenMode();
  const [expanded, setExpanded] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(completed);
  const [showWhatsAppSettings, setShowWhatsAppSettings] = useState(false);
  const [dispatchingMsg, setDispatchingMsg] = useState(false);

  const isWhatsAppGloballyReady = !!userWhatsAppNumber && !!userWhatsAppAutomation;
  const isHabitWhatsAppReady = habit.whatsappEnabled && isWhatsAppGloballyReady;

  const allStepsCompleted = habit.type === 'multi-step' &&
    habit.steps.every((_, idx) => stepCompleted.includes(idx));

  const isFullyDone = completed || allStepsCompleted;

  useEffect(() => {
    if (isFullyDone && !wasCompleted) {
      setWasCompleted(true);
      toast.success('Habit completed!', {
        icon: '✨',
        style: {
          borderRadius: '12px',
          background: '#fff',
          color: '#171717',
          border: '1px solid #e5e5e5',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
      });
    } else if (!isFullyDone && wasCompleted) {
      setWasCompleted(false);
    }
  }, [isFullyDone, wasCompleted]);

  const progress = habit.type === 'multi-step'
    ? (stepCompleted.length / habit.steps.length) * 100
    : isFullyDone ? 100 : 0;

  const getIcon = () => {
    const props = { size: 20, className: isFullyDone ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors duration-200' };
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
    onToggle(habit.id, stepIndex);
  };

  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If they haven't configured their number yet, open the modal
    if (!isWhatsAppGloballyReady) {
      setShowWhatsAppSettings(true);
      return;
    }

    // Otherwise, dispatch a live message!
    setDispatchingMsg(true);
    try {
      const res = await fetch('/api/send-whatsapp-message', { method: 'POST' });
      const result = await res.json();

      if (res.ok && result.sent) {
        toast.success('Live WhatsApp dispatched!', { icon: '📲' });
      } else {
        toast.error(result.preview || 'Automation saved, but dispatch failed.');
      }
    } catch {
      toast.error('Network Error during WhatsApp send');
    } finally {
      setDispatchingMsg(false);
    }
  };

  return (
    <>
      {showWhatsAppSettings && (
        <WhatsAppSettingsModal
          isOpen={showWhatsAppSettings}
          onClose={() => setShowWhatsAppSettings(false)}
          habit={habit}
          onSave={onSettingsSave || (async () => { toast.error("Not implemented on this page"); })}
        />
      )}
      <motion.div
        layout
        className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 ${isFullyDone
          ? 'bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800'
          : 'bg-white dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
          } ${habit.hidden && isHiddenMode ? 'opacity-40 grayscale-[0.5] blur-[0.2px] hover:opacity-100 hover:grayscale-0 hover:blur-0 transition-all duration-500' : ''}`}
        whileHover={!isFullyDone ? { y: -2 } : {}}
      >
        <div className="relative z-10 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => habit.type === 'single-step' ? handleToggle() : setExpanded(!expanded)}
                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 touch-button ${isFullyDone
                  ? 'bg-zinc-100 dark:bg-zinc-800/50'
                  : 'bg-zinc-50 dark:bg-zinc-800/30 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800'
                  }`}
              >
                <div className="relative z-10">
                  {getIcon()}
                </div>
              </motion.button>
 
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 mb-1">
                   <span className={`responsive-text-xs font-medium uppercase tracking-widest px-2 py-0.5 rounded-md ${isFullyDone
                     ? 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                     : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                     }`}>
                     {habit.category}
                   </span>
                   {habit.type === 'multi-step' && (
                     <span className="responsive-text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-widest">
                       {stepCompleted.length}/{habit.steps.length}
                     </span>
                   )}
                   {habit.hidden && isHiddenMode && (
                     <span className="flex items-center justify-center w-5 h-5 bg-indigo-500/10 rounded-full" title="Concealed Ritual">
                       <EyeOff size={10} className="text-indigo-600" />
                     </span>
                   )}
                   {isHabitWhatsAppReady && (
                     <span
                       className={`flex items-center justify-center w-5 h-5 bg-green-500/10 rounded-full cursor-pointer hover:bg-green-500/20 transition-colors ${dispatchingMsg ? 'animate-pulse opacity-50' : ''}`}
                       title="WhatsApp linked - automation enabled. Click to dispatch."
                       onClick={handleWhatsAppClick}
                     >
                       <MessageCircle size={10} className="text-green-600" />
                     </span>
                   )}
                 </div>
                 <h3 className={`responsive-text-base sm:text-[17px] font-semibold tracking-tight transition-all duration-300 ${isFullyDone
                   ? 'text-zinc-500 dark:text-zinc-500 line-through decoration-1'
                   : 'text-zinc-900 dark:text-zinc-100'
                   }`}>
                   {habit.name}
                 </h3>
               </div>
             </div>
 
             <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3 flex-shrink-0">
               {habit.streak > 0 && !isFullyDone && (
                 <div className="hidden sm:flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700/50">
                   <Flame size={12} className="text-orange-500" />
                   <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">{habit.streak}d</span>
                 </div>
               )}
 
               {/* Action Group: WhatsApp -> Edit -> Hide -> Delete */}
               <div className="flex items-center gap-2 sm:gap-3.5">
                 {/* WhatsApp Config Trigger */}
                 <button
                   onClick={(e) => { e.stopPropagation(); setShowWhatsAppSettings(true); }}
                   className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center border ${isHabitWhatsAppReady
                       ? 'text-green-600 bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30 hover:bg-green-100 dark:hover:bg-green-500/25 shadow-sm shadow-green-500/10'
                       : 'text-green-500 bg-green-50/60 dark:bg-green-500/10 border-green-200/60 dark:border-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/20 animate-pulse'
                     }`}
                   title={!isWhatsAppGloballyReady ? "Link WhatsApp to enable automation" : isHabitWhatsAppReady ? "WhatsApp linked - automation enabled." : "Configure WhatsApp Automation"}
                 >
                   <MessageCircle size={14} className="sm:w-4 sm:h-4" />
                 </button>
 
                 {onEdit && (
                   <button
                     onClick={(e) => { e.stopPropagation(); onEdit(habit); }}
                     className="p-1.5 sm:p-2 text-zinc-400 hover:text-indigo-500 transition-colors rounded-lg sm:rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 touch-button"
                     title="Edit Ritual"
                   >
                     <Edit2 size={14} className="sm:w-4 sm:h-4" />
                   </button>
                 )}

                 {onToggleVisibility && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleVisibility(habit.id, !habit.hidden); }}
                      className={`p-1.5 sm:p-2 transition-colors rounded-lg sm:rounded-xl touch-button ${habit.hidden ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                      title={habit.hidden ? "Show Ritual" : "Hide Ritual"}
                    >
                      {habit.hidden ? <Eye size={14} className="sm:w-4 sm:h-4" /> : <EyeOff size={14} className="sm:w-4 sm:h-4" />}
                    </button>
                  )}
 
                 {onDelete && (
                   <button
                     onClick={(e) => { e.stopPropagation(); onDelete(habit.id); }}
                     className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-500 transition-colors rounded-lg sm:rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 touch-button"
                     title="Delete Ritual"
                   >
                     <Trash2 size={14} className="sm:w-4 sm:h-4" />
                   </button>
                 )}
               </div>
 
               {/* Show large toggle only on summary/dashboard, hide on management page */}
               {(!onEdit && !onDelete) && (
                 <button
                   onClick={() => handleToggle()}
                   className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 touch-button ${isFullyDone
                     ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                     : 'border-zinc-300 dark:border-zinc-600 bg-transparent hover:border-zinc-400 dark:hover:border-zinc-500'
                     }`}
                 >
                   {isFullyDone ? (
                     <motion.div
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       transition={{ duration: 0.2 }}
                     >
                       <CheckCircle2 size={12} className="sm:w-4 sm:h-4" strokeWidth={3} />
                     </motion.div>
                   ) : null}
                 </button>
               )}
 
               {habit.type === 'multi-step' && (
                 <motion.button
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.9 }}
                   onClick={() => setExpanded(!expanded)}
                   className="p-1.5 sm:p-2 text-zinc-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 touch-button"
                 >
                   {expanded ? <ChevronUp size={16} className="sm:w-5 sm:h-5" /> : <ChevronDown size={16} className="sm:w-5 sm:h-5" />}
                 </motion.button>
               )}
             </div>

          </div>

          {/* Progress Bar */}
          {habit.type === 'multi-step' && (
            <div className="mb-2">
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${isFullyDone
                    ? 'bg-zinc-400 dark:bg-zinc-500'
                    : 'bg-zinc-800 dark:bg-zinc-200'
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
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  {habit.steps.map((step, idx) => {
                    const isStepDone = stepCompleted.includes(idx);
                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        onClick={() => handleToggle(idx)}
                        className={`w-full flex items-center gap-3 py-3 px-2 transition-all duration-200 text-left relative group border-b border-zinc-50 dark:border-zinc-800/30 last:border-0 ${isStepDone ? 'opacity-60' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg'
                          }`}
                      >
                        {/* Minimal Checkbox */}
                        <div className={`relative flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${isStepDone
                          ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100'
                          : 'border-zinc-300 dark:border-zinc-600 bg-transparent group-hover:border-zinc-400 dark:group-hover:border-zinc-500'
                          }`}>
                          <AnimatePresence mode="wait">
                            {isStepDone && (
                              <motion.div
                                key="check"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <CheckCircle2 size={12} strokeWidth={3} className="text-white dark:text-zinc-900" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Step Text */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-[14px] font-medium transition-all duration-300 ${isStepDone
                            ? 'text-zinc-500 dark:text-zinc-500 line-through decoration-1'
                            : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
                            }`}>
                            {step.name}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
