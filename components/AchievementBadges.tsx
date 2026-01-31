'use client';

import { useEffect, useState } from 'react';
import { Trophy, Flame, Star, Target, Zap, Award, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

const ICON_MAP: Record<string, any> = {
  star: Star,
  flame: Flame,
  trophy: Trophy,
  target: Target,
  zap: Zap,
};

export default function AchievementBadges() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/achievements')
      .then(res => res.json())
      .then(data => {
        setAchievements(data.achievements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="modern-card animate-pulse">
        <div className="h-5 bg-neutral-100 dark:bg-zinc-800 rounded-full w-1/3 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-neutral-50 dark:bg-zinc-800/30 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="modern-card">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl">
          <Award className="text-indigo-600 dark:text-indigo-400" size={18} />
        </div>
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">Milestones</span>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Achievements</h3>
        </div>
      </div>

      <div className="space-y-4">
        {achievements.map((achievement, index) => {
          const Icon = ICON_MAP[achievement.icon] || Award;
          return (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={achievement.id}
              className={`group relative p-3.5 rounded-2xl border transition-all duration-300 ${
                achievement.unlocked 
                  ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' 
                  : 'bg-transparent border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  achievement.unlocked 
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'bg-neutral-100 dark:bg-zinc-800/50 text-zinc-300 dark:text-zinc-600'
                }`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className={`text-sm font-semibold tracking-tight ${
                      achievement.unlocked ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'
                    }`}>
                      {achievement.name}
                    </h4>
                    {achievement.unlocked && (
                      <CheckCircle2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    {achievement.description}
                  </p>
                  
                  {!achievement.unlocked && (
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1 h-1 bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          className="h-full bg-indigo-500/40 dark:bg-indigo-400/30"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-zinc-400">{Math.round((achievement.progress / achievement.maxProgress) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
