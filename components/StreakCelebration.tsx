'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X, CheckCircle2, Award, Sparkles } from 'lucide-react';

export interface CelebrationData {
  streak?: number;
  habitName?: string;
  achievementTitle?: string;
  achievementDesc?: string;
  achievementIcon?: string;
  achievementPoints?: number;
  achievementTier?: string;
}

export interface StreakCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  type: '7-day' | '30-day' | 'daily' | 'custom-streak' | 'achievement';
  data?: CelebrationData;
}

export default function StreakCelebration({ isOpen, onClose, type, data }: StreakCelebrationProps) {
  const isMonth = type === '30-day';
  const isDaily = type === 'daily';
  const isCustomStreak = type === 'custom-streak';
  const isAchievement = type === 'achievement';

  const streakDays = data?.streak || (isMonth ? 30 : type === '7-day' ? 7 : 1);

  // Content configuration
  let badgeLabel = 'Consistency';
  let title = 'Great work today.';
  let description = "You've successfully completed your rituals for today.";

  if (isAchievement) {
    badgeLabel = `Achievement Unlocked${data?.achievementPoints ? ` • +${data.achievementPoints} PTS` : ''}`;
    title = data?.achievementTitle || 'Milestone Accomplished!';
    description = data?.achievementDesc || 'Outstanding discipline and progress.';
  } else if (isMonth) {
    badgeLabel = 'Milestone';
    title = 'Incredible consistency.';
    description = `You've maintained your habits for 30 consecutive days.`;
  } else if (isDaily) {
    badgeLabel = 'Daily Rituals Maintained';
    title = 'All Habits Completed Today!';
    description = "You've successfully checked off 100% of your scheduled habits for today.";
  } else if (isCustomStreak || type === '7-day') {
    badgeLabel = `${streakDays}-Day Streak Maintained`;
    title = `${streakDays} Days Strong!`;
    description = data?.habitName
      ? `You've maintained "${data.habitName}" for ${streakDays} consecutive days.`
      : `You've maintained your habits for ${streakDays} consecutive days without missing a beat.`;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-8 text-center border border-zinc-200 dark:border-zinc-800"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-xl"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={`w-18 h-18 p-4 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm ${
                  isAchievement
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 ring-2 ring-amber-400/30'
                    : isMonth || isCustomStreak || type === '7-day'
                    ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 ring-2 ring-orange-400/30'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-400/30'
                }`}
              >
                {isAchievement ? (
                  data?.achievementIcon ? <span>{data.achievementIcon}</span> : <Trophy size={32} />
                ) : isMonth ? (
                  <Trophy size={32} />
                ) : isDaily ? (
                  <CheckCircle2 size={32} />
                ) : (
                  <Flame size={32} />
                )}
              </motion.div>

              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <span className={`text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                    isAchievement
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : isDaily
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-orange-400/40 bg-orange-500/10 text-orange-700 dark:text-orange-300'
                  }`}>
                    {badgeLabel}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight mt-3">
                    {title}
                  </h2>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-zinc-600 dark:text-zinc-300 text-sm font-medium leading-relaxed max-w-xs mx-auto"
                >
                  {description}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="pt-7"
              >
                <button
                  onClick={onClose}
                  className={`w-full text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-98 ${
                    isAchievement
                      ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400'
                      : isDaily
                      ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400'
                      : 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                  }`}
                >
                  Keep Up the Momentum
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
