'use client';

import { Achievement, AchievementTier } from '@/types';
import { motion } from 'framer-motion';
import { Star, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementCardProps {
  achievement: Achievement;
}

const TIER_STYLES: Record<AchievementTier, string> = {
  Bronze: 'text-orange-700 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400',
  Silver: 'text-slate-700 bg-slate-100 dark:bg-slate-800/40 dark:text-slate-400',
  Gold: 'text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400',
  Platinum: 'text-cyan-700 bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-400',
  Diamond: 'text-blue-700 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400',
  Legendary: 'text-purple-700 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400',
};

const TIER_BORDER: Record<AchievementTier, string> = {
  Bronze: 'border-orange-200 dark:border-orange-900/50',
  Silver: 'border-slate-200 dark:border-slate-800/50',
  Gold: 'border-amber-200 dark:border-amber-900/50',
  Platinum: 'border-cyan-200 dark:border-cyan-900/50',
  Diamond: 'border-blue-200 dark:border-blue-900/50',
  Legendary: 'border-purple-200 dark:border-purple-900/50',
};

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const isHidden = achievement.hidden && !achievement.achieved;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={achievement.achieved ? { y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' } : {}}
      className={cn(
        "relative p-3.5 sm:p-5 rounded-3xl border-2 transition-all duration-300",
        achievement.achieved 
          ? "bg-white dark:bg-zinc-900 shadow-sm" 
          : "bg-zinc-50/50 dark:bg-zinc-900/30 opacity-60 border-dashed border-zinc-200 dark:border-zinc-800",
        achievement.achieved && TIER_BORDER[achievement.tier]
      )}
    >
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-inner",
          achievement.achieved ? "bg-zinc-50 dark:bg-zinc-800" : "bg-zinc-100 dark:bg-zinc-800/50"
        )}>
          {isHidden ? "???" : achievement.icon}
        </div>
        
        {!isHidden && (
          <span className={cn(
            "text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-full",
            TIER_STYLES[achievement.tier]
          )}>
            {achievement.tier}
          </span>
        )}
      </div>
 
      <div className="space-y-0.5 sm:space-y-1">
        <h4 className={cn(
          "font-bold responsive-text-base leading-tight",
          achievement.achieved ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-500"
        )}>
          {isHidden ? "Hidden Achievement" : achievement.title}
        </h4>
        <p className="responsive-text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-tight">
          {isHidden ? "Keep pushing to uncover this secret ritual." : achievement.description}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {achievement.achieved ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Unlocked</span>
            </>
          ) : (
            <>
              <Lock size={10} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Locked</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <Star size={10} className="text-amber-500 fill-amber-500" />
          <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{achievement.points}</span>
        </div>
      </div>

      {/* Progress Bar for Locked Non-Hidden Achievements */}
      {!achievement.achieved && !isHidden && achievement.progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(achievement.progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress}%` }}
              className="h-full bg-indigo-500 rounded-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
