'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Habit } from '@/types';
import { 
  Plus, 
  Info, 
  Search, 
  Sparkles, 
  Flame, 
  ListChecks, 
  Target, 
  X,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HabitCard from '@/components/HabitCard';
import { HabitSkeleton } from '@/components/Skeleton';
import { toast } from 'react-hot-toast';
import EditHabitModal from '@/components/EditHabitModal';
import { useHiddenMode } from '@/context/HiddenModeContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableHabitCard({
  habit,
  completed,
  onToggle,
  onEdit,
  onDelete,
  onToggleVisibility,
  showOrderControls,
}: {
  habit: Habit;
  completed: boolean;
  onToggle: (habitId: string, stepIndex?: number) => void;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
  onToggleVisibility?: (habitId: string, hidden: boolean) => void;
  showOrderControls?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: habit.id,
    disabled: !showOrderControls,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 40 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <HabitCard
        habit={habit}
        completed={completed}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleVisibility={onToggleVisibility}
        showOrderControls={showOrderControls}
        dragHandleProps={showOrderControls ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHabitForEdit, setSelectedHabitForEdit] = useState<Habit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  // Instant click-based toggle (5-second hold removed)
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

  // Drag & Drop Sensors & Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const activeHabit = useMemo(() => {
    return activeId ? habits.find(h => h.id === activeId) || null : null;
  }, [activeId, habits]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = habits.findIndex(h => h.id === active.id);
    const newIndex = habits.findIndex(h => h.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newHabits = arrayMove(habits, oldIndex, newIndex);
    setHabits(newHabits);

    try {
      const res = await fetch('/api/habits/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitIds: newHabits.map(h => h.id) }),
      });
      if (res.ok) {
        toast.success('Habit order saved', { id: 'reorder-toast', duration: 1500 });
      } else {
        fetchHabits();
      }
    } catch {
      fetchHabits();
    }
  };

  const { isHiddenMode } = useHiddenMode();

  const categories = ['All', 'Health', 'Fitness', 'Productivity', 'Mindfulness', 'Growth', 'Other'];

  const filteredHabits = useMemo(() => {
    let result = habits;
    if (activeCategory !== 'All') {
      result = result.filter(h => h.category === activeCategory);
    }
    if (!isHiddenMode) {
      result = result.filter(h => !h.hidden);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(h => 
        h.name.toLowerCase().includes(query) || 
        (h.description && h.description.toLowerCase().includes(query))
      );
    }
    return result;
  }, [habits, activeCategory, isHiddenMode, searchQuery]);

  // High-level statistics
  const streakCount = useMemo(() => habits.filter(h => (h.streak || 0) > 0).length, [habits]);
  const multiStepCount = useMemo(() => habits.filter(h => h.type === 'multi-step').length, [habits]);

  if (!hasMounted) return null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-16">
      {/* Executive Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 pb-1 sm:pb-2">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
              <Sparkles size={10} />
              Habits & Routines
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700">
              {habits.length} {habits.length === 1 ? 'Ritual' : 'Rituals'}
            </span>
            {streakCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40">
                <Flame size={10} className="text-orange-500 fill-orange-500" />
                {streakCount} {streakCount === 1 ? 'Streak' : 'Streaks'}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              My Habits & Routines
            </h1>
            {/* Mobile-only compact New Habit Button */}
            <button
              onClick={() => router.push('/dashboard/habits/new')}
              className="sm:hidden inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all shrink-0"
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          </div>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
            Curate your daily rituals, track unbroken consistency, and drag the <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">::</span> handle to prioritize execution order.
          </p>
        </div>

        {/* Desktop Action Button */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/habits/new')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all touch-button"
          >
            <Plus size={16} />
            <span>Create New Habit</span>
          </button>
        </div>
      </div>

      {/* Routine Quick Overview: Sleek pill bar on mobile, 3 cards on desktop */}
      <div className="sm:hidden flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12141D] border border-slate-200/80 dark:border-white/[0.08] shadow-xs text-xs">
        <div className="flex items-center gap-1.5">
          <Target size={14} className="text-indigo-500" />
          <span className="font-extrabold text-slate-900 dark:text-white">{habits.length}</span>
          <span className="text-[11px] text-slate-400 font-medium">Rituals</span>
        </div>
        <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <Flame size={14} className="text-orange-500 fill-orange-500" />
          <span className="font-extrabold text-slate-900 dark:text-white">{streakCount}</span>
          <span className="text-[11px] text-slate-400 font-medium">Streaks</span>
        </div>
        <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <ListChecks size={14} className="text-purple-500" />
          <span className="font-extrabold text-slate-900 dark:text-white">{multiStepCount}</span>
          <span className="text-[11px] text-slate-400 font-medium">Checklists</span>
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-900/40">
            <Target size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{habits.length}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Rituals</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/60 dark:border-orange-900/40">
            <Flame size={18} className="fill-orange-500 text-orange-500" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{streakCount}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">On Active Streak</div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-900/40">
            <ListChecks size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{multiStepCount}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checklists / Tasks</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x pb-1 md:pb-0">
          {categories.map((cat) => {
            const count = cat === 'All' 
              ? habits.length 
              : habits.filter(h => h.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search habits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Habits List Container with Drag & Drop */}
      {loading ? (
        <div className="space-y-3.5">
          {[...Array(4)].map((_, i) => (
            <HabitSkeleton key={i} />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredHabits.map((h) => h.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 sm:space-y-3.5">
              {filteredHabits.map((habit) => (
                <SortableHabitCard
                  key={habit.id}
                  habit={habit}
                  completed={false}
                  onToggle={() => fetchHabits()}
                  onEdit={handleEditHabit}
                  onDelete={handleDeleteHabit}
                  onToggleVisibility={handleToggleVisibility}
                  showOrderControls={activeCategory === 'All' && !searchQuery.trim()}
                />
              ))}

              {filteredHabits.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center bg-white dark:bg-[#12141D] rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 p-8 space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <Info size={26} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {searchQuery ? 'No habits matching your search' : 'No habits found in this category'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {searchQuery 
                      ? 'Try adjusting your search terms or clear the filter.' 
                      : 'Create a new habit or ritual to start tracking your daily progress.'}
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/habits/new')}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    <Plus size={14} />
                    <span>Create Habit</span>
                  </button>
                </motion.div>
              )}
            </div>
          </SortableContext>

          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeHabit ? (
              <div className="shadow-2xl ring-2 ring-indigo-500/50 rounded-2xl scale-[1.01] opacity-95 pointer-events-none">
                <HabitCard
                  habit={activeHabit}
                  completed={false}
                  onToggle={() => {}}
                  showOrderControls={true}
                  isDragOverlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit Habit Modal */}
      <EditHabitModal
        isOpen={isEditModalOpen}
        habit={selectedHabitForEdit}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchHabits}
      />
    </div>
  );
}
