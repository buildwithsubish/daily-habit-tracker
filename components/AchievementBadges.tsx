'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, CheckCircle2, Lock, Star, Trophy, Target, Flame, Zap, Clock, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement, AchievementTier } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORY_ICON: Record<string, any> = {
  'Fitness & Gym': Dumbbell,
  'Streak': Flame,
  'Completion': Trophy,
  'Time-Based': Clock,
  'Diversity': Zap,
  'Consistency': Target,
  'Milestone & Special': Award,
};

const TIER_COLORS: Record<AchievementTier, string> = {
  Bronze: 'text-orange-500 bg-orange-500/10',
  Silver: 'text-slate-400 bg-slate-400/10',
  Gold: 'text-amber-500 bg-amber-500/10',
  Platinum: 'text-cyan-500 bg-cyan-500/10',
  Diamond: 'text-blue-500 bg-blue-500/10',
  Legendary: 'text-purple-500 bg-purple-500/10',
};

export default function AchievementBadges() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/achievements')
      .then(res => res.json())
      .then(data => {
        // Show only a subset or most recent in the sidebar
        setAchievements(data.achievements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="flex-1 space-y-2 mt-1">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Shown up to 5 focused achievements (prioritize almost-complete or recently completed)
  const displayedAchievements = achievements
    .sort((a, b) => {
      if (a.achieved === b.achieved) {
        return (b.progress || 0) - (a.progress || 0);
      }
      return a.achieved ? 1 : -1;
    })
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Progress</h3>
        <Award size={14} className="text-indigo-500" />
      </div>

      <div className="space-y-4">
        {displayedAchievements.map((achievement) => {
          const isHidden = achievement.hidden && !achievement.achieved;
          const CategoryIcon = CATEGORY_ICON[achievement.category] || Award;
          
          return (
            <div key={achievement.id} className="group relative">
              <div className="flex gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-110",
                  achievement.achieved 
                    ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700" 
                    : "bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 opacity-60"
                )}>
                  {isHidden ? (
                    <Lock size={14} className="text-slate-300" />
                  ) : (
                    achievement.icon
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className={cn(
                      "text-xs font-bold truncate",
                      achievement.achieved ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {isHidden ? "Hidden Quest" : achievement.title}
                    </h4>
                    {!isHidden && (
                      <div className={cn("text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full", TIER_COLORS[achievement.tier])}>
                        {achievement.tier}
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${achievement.progress || 0}%` }}
                      className={cn(
                        "h-full rounded-full",
                        achievement.achieved ? "bg-green-500" : "bg-indigo-500/50"
                      )}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      {achievement.achieved ? "Completed" : `${Math.round(achievement.progress || 0)}% Done`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star size={8} className="text-amber-500 fill-amber-500" />
                      <span className="text-[9px] font-black text-slate-500">{achievement.points}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/dashboard/achievements"
        className="block text-center w-full py-2.5 mt-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 transition-colors border border-slate-100 dark:border-slate-800"
      >
        View All Milestones
      </Link>
    </div>
  );
}
