'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X, CheckCircle2 } from 'lucide-react';

interface StreakCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  type: '7-day' | '30-day' | 'daily';
}

export default function StreakCelebration({ isOpen, onClose, type }: StreakCelebrationProps) {
  const isMonth = type === '30-day';
  const isDaily = type === 'daily';

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
            className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-xl overflow-hidden p-8 text-center border border-zinc-200 dark:border-zinc-800"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="relative">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                {isMonth ? (
                  <Trophy className="text-zinc-900 dark:text-zinc-100" size={28} />
                ) : isDaily ? (
                  <CheckCircle2 className="text-zinc-900 dark:text-zinc-100" size={28} />
                ) : (
                  <Flame className="text-zinc-900 dark:text-zinc-100" size={28} />
                )}
              </motion.div>

              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
                    {isMonth ? 'Milestone' : isDaily ? 'Daily Goal' : 'Consistency'}
                  </span>
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight mt-1">
                    {isMonth ? 'Incredible consistency.' : isDaily ? 'Great work today.' : 'One week strong.'}
                  </h2>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed max-w-xs mx-auto"
                >
                  {isDaily
                    ? "You've successfully completed your rituals for today."
                    : `You've maintained your habits for ${isMonth ? '30' : '7'} consecutive days.`}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="pt-8"
              >
                <button
                  onClick={onClose}
                  className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-xl font-medium text-sm transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  Continue
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
