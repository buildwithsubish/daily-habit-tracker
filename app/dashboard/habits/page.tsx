'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Habit } from '@/types';
import { Plus, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HabitCard from '@/components/HabitCard';
import { HabitSkeleton } from '@/components/Skeleton';
import { toast } from 'react-hot-toast';
import EditHabitModal from '@/components/EditHabitModal';
import { useHiddenMode } from '@/context/HiddenModeContext';
import BrandMark from '@/components/BrandMark';

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedHabitForEdit, setSelectedHabitForEdit] = useState<Habit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => { setHasMounted(true); fetchHabits(); }, []);

  const fetchHabits = async () => {
    try {
      const res = await fetch('/api/habits');
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (error) { console.error('Failed to fetch habits:', error); }
    finally { setLoading(false); }
  };

  const handleEditHabit = (habit: Habit) => {
    setSelectedHabitForEdit(habit);
    setIsEditModalOpen(true);
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (window.confirm('Are you sure you want to delete this habit? This cannot be undone.')) {
      try {
        const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Habit deleted');
          fetchHabits();
        } else {
          toast.error('Failed to delete habit');
        }
      } catch (error) {
        toast.error('An error occurred');
      }
    }
  };

  const handleToggleVisibility = async (habitId: string, hidden: boolean) => {
    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
      if (res.ok) {
        toast.success(hidden ? 'Ritual concealed' : 'Ritual revealed', {
          icon: hidden ? '👻' : '👁️',
        });
        fetchHabits();
      } else {
        toast.error('Failed to update visibility');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const { isHiddenMode } = useHiddenMode();

  const categories = ['All', 'Health', 'Mindset', 'Growth', 'Other'];
  const filteredHabits = useMemo(() => {
    let base = activeCategory === 'All' ? habits : habits.filter(h => h.category === activeCategory);
    if (!isHiddenMode) {
      return base.filter(h => !h.hidden);
    }
    return base;
  }, [habits, activeCategory, isHiddenMode]);

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 pb-20 pt-24">
      <div className="responsive-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-8 mb-6 sm:mb-12">
          <div className="flex flex-col gap-1 sm:gap-2">
            <span className="responsive-text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-1">Management</span>
            <BrandMark />
            <p className="responsive-text-xs sm:responsive-text-base text-zinc-500 dark:text-zinc-400 font-medium tracking-tight px-1">Curate the habits that define who you are.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mt-1 sm:mt-0">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-1 rounded-lg sm:rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-x-auto no-scrollbar max-w-full">
              {categories.map((cat) => (<motion.button key={cat} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveCategory(cat)} className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-md sm:rounded-xl responsive-text-xs font-bold capitalize transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>{cat}</motion.button>))}
            </motion.div>
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/dashboard/habits/new')} className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 touch-button"><Plus size={16} />New Habit</motion.button>
            </div>
          </div>
        </motion.div>
        {loading ? (<div className="responsive-grid-mobile md:responsive-grid">{[...Array(6)].map((_, i) => <HabitSkeleton key={i} />)}</div>) : (<div className="responsive-grid-mobile md:responsive-grid"><AnimatePresence mode="popLayout">{filteredHabits.map((habit, index) => (<motion.div key={habit.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: index * 0.03 }}><HabitCard habit={habit} completed={false} onToggle={() => fetchHabits()} onEdit={handleEditHabit} onDelete={handleDeleteHabit} onToggleVisibility={handleToggleVisibility} /></motion.div>))}{filteredHabits.length === 0 && (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="col-span-full py-16 text-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800"><div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4"><Info size={24} className="text-indigo-500 dark:text-indigo-400 sm:w-8 sm:h-8" /></div><h3 className="responsive-text-sm sm:responsive-text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">No habits found</h3><p className="responsive-text-xs text-zinc-500 dark:text-zinc-400 mb-4">Start by creating your first habit.</p><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/dashboard/habits/new')} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20">Create Your First Habit</motion.button></motion.div>)}</AnimatePresence></div>)}
        <EditHabitModal isOpen={isEditModalOpen} habit={selectedHabitForEdit} onClose={() => setIsEditModalOpen(false)} onSuccess={fetchHabits} />
      </div>
    </div>
  );
}
