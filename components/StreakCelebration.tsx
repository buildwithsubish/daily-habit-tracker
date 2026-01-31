'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface StreakCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  type: '7-day' | '30-day' | 'daily';
}

const ConfettiParticle = ({ index }: { index: number }) => {
  const x = Math.random() * 400 - 200;
  const y = Math.random() * -400 - 100;
  const rotation = Math.random() * 360;
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  const color = colors[index % colors.length];

  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
      animate={{ 
        x, 
        y, 
        scale: [0, 1, 0.5, 0], 
        rotate: rotation,
        opacity: [0, 1, 1, 0]
      }}
      transition={{ 
        duration: 2.5, 
        ease: "easeOut",
        delay: Math.random() * 0.2
      }}
      className="absolute w-2 h-2 rounded-sm"
      style={{ backgroundColor: color }}
    />
  );
};

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
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8 sm:p-12 text-center border border-zinc-200 dark:border-zinc-800"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="relative">
              {/* Confetti container */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <ConfettiParticle key={i} index={i} />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8"
              >
                {isMonth ? (
                  <Trophy className="text-indigo-600 dark:text-indigo-400" size={40} />
                ) : isDaily ? (
                  <CheckCircle2 className="text-indigo-600 dark:text-indigo-400" size={40} />
                ) : (
                  <Flame className="text-indigo-600 dark:text-indigo-400" size={40} />
                )}
              </motion.div>

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-semibold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Momentum Achieved</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
                    {isMonth ? 'Incredible consistency!' : isDaily ? 'Nice work showing up again!' : 'A whole week of growth!'}
                  </h2>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed max-w-xs mx-auto"
                >
                  {isDaily 
                    ? "You've completed your rituals for today. Take a moment to appreciate your progress."
                    : `You've maintained your habits for ${isMonth ? '30' : '7'} consecutive days. This is becoming part of who you are.`}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="pt-10"
              >
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-10 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-zinc-900/10"
                >
                  Continue your journey
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
