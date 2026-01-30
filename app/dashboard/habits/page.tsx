'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Habit } from '@/types';
import { Plus, Target, Zap, Clock, Calendar, Sparkles, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HabitCard from '@/components/HabitCard';
import HabitStats from '@/components/HabitStats';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    setHasMounted(true);
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const res = await fetch('/api/habits');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Health', 'Mindset', 'Growth', 'Other'];

  const filteredHabits = activeCategory === 'All' 
    ? habits 
    : habits.filter(h => h.category === activeCategory);

  if (!hasMounted) return null;

  return (
    <div className="space-y-12 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
            <Target size={14} />
            <span>Operational Protocols</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.8] uppercase">
            Master Your<br />
            <span className="text-slate-300 dark:text-slate-800">Routine.</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push('/dashboard/habits/new')}
            className="bg-black dark:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center gap-3 shadow-xl shadow-black/10 dark:shadow-blue-500/20"
          >
            <Plus size={18} />
            Initialize Module
          </button>
        </div>
      </div>

      {/* Stats QuickView */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Active Protocols", value: habits.length, icon: Zap, color: "text-amber-500" },
          { label: "Average Velocity", value: "84%", icon: Target, color: "text-blue-500" },
          { label: "Total Compliance", value: "1,240", icon: Calendar, color: "text-emerald-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-blue-500/30 transition-all duration-500">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
              <p className="text-4xl font-black dark:text-white">{stat.value}</p>
            </div>
            <div className={`p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredHabits.map((habit) => (
            <motion.div
              key={habit.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              <HabitCard 
                habit={habit} 
                completed={false} 
                onToggle={() => fetchHabits()}
              />
            </motion.div>
          ))}
          
          {filteredHabits.length === 0 && !loading && (
            <div className="lg:col-span-full py-32 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-300 dark:text-slate-800">
                <Target size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight dark:text-white">No Active Protocols</h3>
                <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">Initialize your first module to begin tracking performance.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
