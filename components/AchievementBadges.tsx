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
      <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 animate-pulse">
        <div className="h-6 bg-slate-100 rounded-full w-1/2 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-50 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-black p-2 rounded-xl">
          <Award className="text-white" size={20} />
        </div>
        <div>
          <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Your Progress</span>
          <h3 className="text-xl font-black text-black tracking-tight">Achievements</h3>
        </div>
      </div>

      <div className="space-y-4">
        {achievements.map((achievement, index) => {
          const Icon = ICON_MAP[achievement.icon] || Award;
          return (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={achievement.id}
              className={`group relative p-4 rounded-[1.5rem] border-2 transition-all duration-500 ${
                achievement.unlocked 
                  ? 'bg-black border-black shadow-xl shadow-black/10' 
                  : 'bg-slate-50 border-transparent hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors ${
                  achievement.unlocked ? 'bg-white/10 text-white' : 'bg-white text-slate-300'
                }`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-black tracking-tight uppercase ${
                      achievement.unlocked ? 'text-white' : 'text-slate-900'
                    }`}>
                      {achievement.name}
                    </h4>
                    {achievement.unlocked && (
                      <CheckCircle2 size={14} className="text-white" />
                    )}
                  </div>
                  <p className={`text-[10px] font-bold leading-tight ${
                    achievement.unlocked ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {achievement.description}
                  </p>
                  
                  {!achievement.unlocked && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Progress</span>
                        <span>{Math.round((achievement.progress / achievement.maxProgress) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          className="h-full bg-black"
                        />
                      </div>
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
