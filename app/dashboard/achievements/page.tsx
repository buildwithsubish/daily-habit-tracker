'use client';

import { useEffect, useState, useMemo } from 'react';
import { Achievement, AchievementCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Award, Star, Trophy, Zap, Clock, Flame, Layout, MoreHorizontal, Sparkles } from 'lucide-react';
import AchievementCard from '@/components/AchievementCard';
import { AchievementSkeleton } from '@/components/Skeleton';
import { cn } from '@/lib/utils';

const CATEGORIES: { id: AchievementCategory | 'All'; label: string; icon: any }[] = [
  { id: 'All', label: 'All', icon: Layout },
  { id: 'Streak', label: 'Streak', icon: Flame },
  { id: 'Completion', label: 'Completion', icon: Trophy },
  { id: 'Time-Based', label: 'Time-Based', icon: Clock },
  { id: 'Diversity', label: 'Diversity', icon: Zap },
  { id: 'Consistency', label: 'Consistency', icon: Filter },
  { id: 'Milestone & Special', label: 'Special', icon: Award },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<{ totalPoints: number; unlockedCount: number; totalCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'All'>('All');

  useEffect(() => {
    fetch('/api/achievements')
      .then(res => res.json())
      .then(data => {
        setAchievements(data.achievements || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredAchievements = useMemo(() => {
    return achievements.filter(achievement => {
      const matchesSearch = achievement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          achievement.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || achievement.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [achievements, searchQuery, activeCategory]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="responsive-text-xl font-black text-slate-900 dark:text-white tracking-tightest leading-none">
            Achievements
          </h1>
          <p className="responsive-text-xs sm:responsive-text-base text-slate-500 dark:text-slate-400 font-medium tracking-tight">
            Celebrate your consistency and growth.
          </p>
        </div>

        {/* High-level Stats */}
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Points</span>
            <div className="flex items-center gap-1.5">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span className="text-xl font-black text-zinc-900 dark:text-white">{stats?.totalPoints || 0}</span>
            </div>
          </div>
          <div className="px-5 py-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Unlocked</span>
            <div className="flex items-center gap-1.5">
              <Award size={16} className="text-indigo-500" />
              <span className="text-xl font-black text-zinc-900 dark:text-white">
                {stats?.unlockedCount || 0}<span className="text-zinc-300 dark:text-zinc-600">/{stats?.totalCount || 0}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Category Filters */}
        <div className="w-full overflow-x-auto pb-1 -mb-1 no-scrollbar">
          <div className="flex items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border",
                  activeCategory === cat.id
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <cat.icon size={14} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search achievements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-5 py-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Achievement Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <AchievementSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredAchievements.length > 0 ? (
              filteredAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                  <MoreHorizontal className="text-zinc-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">No achievements found</h3>
                  <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Motivational Tier Legend */}
      <div className="mt-16 p-8 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Sparkles className="text-indigo-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">The Path to Mastery</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Understand your progress tiers</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { tier: 'Bronze', points: '5-25', desc: 'Starting strong', color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { tier: 'Silver', points: '15-40', desc: 'Finding rhythm', color: 'text-slate-400', bg: 'bg-slate-400/10' },
              { tier: 'Gold', points: '75-150', desc: 'Consistent growth', color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { tier: 'Platinum', points: '60-200', desc: 'Daily discipline', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
              { tier: 'Diamond', points: '200+', desc: 'Elite resilience', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { tier: 'Legendary', points: '1000+', desc: 'Ascended status', color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ].map((item) => (
              <div key={item.tier} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 space-y-2">
                <div className={cn("inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter", item.color, item.bg)}>
                  {item.tier}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{item.points} <span className="text-[10px] font-medium text-slate-400">pts</span></div>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
