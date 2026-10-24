'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, Flame, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export interface EarnedAppreciationData {
  id: string;
  type: 'achievement' | 'daily-completed' | 'streak-maintained';
  emoji: string;
  badgeTag: string;
  title: string;
  message: string;
  achievementId?: string;
  actionUrl?: string;
  actionText?: string;
}

interface EarnedAppreciationBannerProps {
  appreciation: EarnedAppreciationData;
  onDismiss: () => void;
  onAction?: () => void;
}

export default function EarnedAppreciationBanner({
  appreciation,
  onDismiss,
  onAction,
}: EarnedAppreciationBannerProps) {
  const isAchievement = appreciation.type === 'achievement';
  const isDaily = appreciation.type === 'daily-completed';
  const isStreak = appreciation.type === 'streak-maintained';

  const themeStyles = isAchievement
    ? {
        container: 'border-amber-300/80 bg-amber-50/90 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100 shadow-sm',
        iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 ring-1 ring-amber-400/40',
        badge: 'bg-amber-200/70 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300/60 dark:border-amber-500/30',
        btnAction: 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400',
        btnDismiss: 'hover:bg-amber-900/10 text-amber-800 dark:text-amber-300 dark:hover:bg-white/10',
      }
    : isStreak
    ? {
        container: 'border-orange-300/80 bg-orange-50/90 text-orange-950 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-100 shadow-sm',
        iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300 ring-1 ring-orange-400/40',
        badge: 'bg-orange-200/70 text-orange-900 dark:bg-orange-500/20 dark:text-orange-300 border-orange-300/60 dark:border-orange-500/30',
        btnAction: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:text-zinc-950 dark:hover:bg-orange-400',
        btnDismiss: 'hover:bg-orange-900/10 text-orange-800 dark:text-orange-300 dark:hover:bg-white/10',
      }
    : {
        container: 'border-emerald-300/80 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100 shadow-sm',
        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 ring-emerald-400/40',
        badge: 'bg-emerald-200/70 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-500/30',
        btnAction: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400',
        btnDismiss: 'hover:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300 dark:hover:bg-white/10',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.99 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <div className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 sm:px-5 ${themeStyles.container}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Icon & Content */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${themeStyles.iconBg}`}>
              {appreciation.emoji || (isAchievement ? <Trophy size={20} /> : isStreak ? <Flame size={20} /> : <CheckCircle2 size={20} />)}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${themeStyles.badge}`}>
                  {appreciation.badgeTag}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight">
                {appreciation.title}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90 max-w-2xl">
                {appreciation.message}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center pl-14 sm:pl-0">
            {appreciation.actionUrl && (
              <Link
                href={appreciation.actionUrl}
                onClick={onAction}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 ${themeStyles.btnAction}`}
              >
                <span>{appreciation.actionText || 'View Details'}</span>
                <ArrowRight size={13} />
              </Link>
            )}

            <button
              onClick={onDismiss}
              aria-label="Dismiss recognition"
              title="Dismiss"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${themeStyles.btnDismiss}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
