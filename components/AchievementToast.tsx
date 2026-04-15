'use client';

import React from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { Achievement, AchievementTier } from '@/types';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface AchievementToastProps {
  achievement: Achievement;
  t: { id: string; visible: boolean };
}

const TIER_COLORS: Record<AchievementTier, string> = {
  Bronze: 'from-orange-500/20 to-orange-600/20 text-orange-400 border-orange-500/30',
  Silver: 'from-slate-400/20 to-slate-500/20 text-slate-300 border-slate-400/30',
  Gold: 'from-amber-400/20 to-amber-500/20 text-amber-400 border-amber-500/30',
  Platinum: 'from-cyan-400/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Diamond: 'from-blue-500/20 to-blue-600/20 text-blue-400 border-blue-500/30',
  Legendary: 'from-purple-500/20 to-purple-600/20 text-purple-400 border-purple-500/30',
};

const TIER_GLOW: Record<AchievementTier, string> = {
  Bronze: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
  Silver: 'shadow-[0_0_20px_rgba(148,163,184,0.15)]',
  Gold: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]',
  Platinum: 'shadow-[0_0_20px_rgba(34,211,238,0.15)]',
  Diamond: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  Legendary: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',
};

export default function AchievementToast({ achievement, t }: AchievementToastProps) {
  const controls = useAnimation();

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      toast.dismiss(t.id);
    } else {
      controls.start({ x: 0, opacity: 1 });
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ 
        opacity: t.visible ? 1 : 0, 
        y: t.visible ? 0 : 50,
        scale: t.visible ? 1 : 0.9
      }}

      className={cn(
        "relative flex items-center gap-4 p-4 min-w-[320px] max-w-md w-[92vw] sm:w-auto",
        "bg-zinc-900/90 backdrop-blur-xl border rounded-2xl md:rounded-3xl cursor-grab active:cursor-grabbing select-none",
        TIER_COLORS[achievement.tier],
        TIER_GLOW[achievement.tier]
      )}
    >
      <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-white/5 rounded-2xl flex items-center justify-center text-2xl md:text-3xl border border-white/10 shadow-inner">
        {achievement.icon}
      </div>

      <div className="flex-grow min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-black uppercase tracking-tighter text-white/40">New Achievement</span>
          <div className="h-1 w-1 rounded-full bg-white/20" />
          <span className={cn("text-[10px] font-black uppercase tracking-tighter", TIER_COLORS[achievement.tier].split(' ')[2])}>
            {achievement.tier}
          </span>

        </div>
        <h4 className="font-bold text-sm md:text-base text-white truncate line-clamp-1">
          {achievement.title}
        </h4>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded-md border border-white/10">
            <Star size={10} className="text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-bold text-white/80">+{achievement.points}</span>
          </div>
          <span className="text-[10px] text-white/40 italic">Swipe to dismiss</span>
        </div>
      </div>

      <button 
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 p-2 text-white/20 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>

      {/* Progress gradient bar at bottom */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full rounded-b-full overflow-hidden">
        <motion.div 
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
          className={cn("h-full bg-gradient-to-r", TIER_COLORS[achievement.tier].split(' ').slice(0, 2).join(' '))}
        />
      </div>
    </motion.div>
  );
}
