'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X, Sparkles, Star, CheckCircle2 } from 'lucide-react';

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden p-10 sm:p-16 text-center"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-black" />
            
            <button
              onClick={onClose}
              className="absolute top-8 right-8 p-3 hover:bg-slate-50 rounded-2xl transition-all group"
            >
              <X size={24} className="text-slate-300 group-hover:text-black transition-colors" />
            </button>

            <div className="relative space-y-10">
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                className="w-28 h-28 sm:w-36 sm:h-36 bg-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-black/30"
              >
                {isMonth ? (
                  <Trophy className="text-white" size={60} />
                ) : isDaily ? (
                  <CheckCircle2 className="text-white" size={60} />
                ) : (
                  <Flame className="text-white" size={60} />
                )}
              </motion.div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="text-[10px] font-black tracking-[0.4em] text-blue-500 uppercase">You're doing great!</span>
                  <h2 className="text-4xl sm:text-6xl font-black text-black tracking-tighter mt-3 leading-none">
                    {isMonth ? 'AMAZING WORK!' : isDaily ? 'GOAL REACHED!' : 'WEEKLY STAR!'}
                  </h2>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-slate-500 font-bold text-xl leading-relaxed max-w-sm mx-auto"
                >
                  {isDaily 
                    ? "You've finished everything for today! Take a moment to celebrate."
                    : `You've kept your habits for ${isMonth ? '30' : '7'} days in a row! We're so proud of you.`}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="pt-4"
              >
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  Keep going!
                </button>
              </motion.div>

              {/* Decorative Elements */}
              <div className="absolute -top-20 -left-10 text-slate-100 -z-10">
                <Sparkles size={120} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
