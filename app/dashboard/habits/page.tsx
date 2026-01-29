'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Habit } from '@/types';
import { Plus, Trash2, Edit, X, Layers, Search, Sparkles, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presets, setPresets] = useState<any[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [applyingPresetId, setApplyingPresetId] = useState<string | null>(null);

  useEffect(() => {
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

  const fetchPresets = async () => {
    setPresetsLoading(true);
    try {
      const res = await fetch('/api/presets');
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setPresetsLoading(false);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    setApplyingPresetId(presetId);
    try {
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;

      const res = await fetch('/api/presets/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetName: preset.name }),
      });
      
      if (res.ok) {
        setShowPresetModal(false);
        fetchHabits();
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
    } finally {
      setApplyingPresetId(null);
    }
  };

  const handleDelete = useCallback((habit: Habit) => {
    setHabitToDelete(habit);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!habitToDelete) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/habits/${habitToDelete.id}`, { method: 'DELETE' });
      fetchHabits();
      setDeleteModalOpen(false);
      setHabitToDelete(null);
    } catch (error) {
      console.error('Failed to delete habit:', error);
    } finally {
      setDeleteLoading(false);
    }
  }, [habitToDelete]);

  const confirmDeleteAll = useCallback(async () => {
    setDeleteAllLoading(true);
    try {
      await Promise.all(habits.map(h => fetch(`/api/habits/${h.id}`, { method: 'DELETE' })));
      fetchHabits();
      setDeleteAllModalOpen(false);
    } catch (error) {
      console.error('Failed to delete all habits:', error);
    } finally {
      setDeleteAllLoading(false);
    }
  }, [habits]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = habits.findIndex((h) => h.id === active.id);
      const newIndex = habits.findIndex((h) => h.id === over.id);
      const newHabits = arrayMove(habits, oldIndex, newIndex);
      setHabits(newHabits);
      try {
        await fetch('/api/habits/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ habitIds: newHabits.map(h => h.id) }),
        });
      } catch (error) {
        fetchHabits();
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Your Routine</h1>
          <p className="text-slate-500 font-medium">Create a routine that works for you.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {habits.length > 0 && (
            <button
              onClick={() => setDeleteAllModalOpen(true)}
              className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all flex items-center gap-2"
            >
              <Trash2 size={18} />
              Clear All
            </button>
          )}
          <button
            onClick={async () => {
              await fetchPresets();
              setShowPresetModal(true);
            }}
            className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center gap-2"
          >
            <Layers size={18} />
            Get Ideas
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} />
            New Habit
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Getting things ready...</p>
        </div>
      ) : habits.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-16 text-center"
        >
          <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="text-blue-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Start Your Routine</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">Start with small steps. Consistency is the secret to building healthy habits that last!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
          >
            CREATE MY FIRST HABIT
          </button>
        </motion.div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {habits.map((habit, index) => (
                  <SortableHabitCard
                    key={habit.id}
                    habit={habit}
                    index={index}
                    onDelete={handleDelete}
                    onEdit={setEditingHabit}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <HabitFormModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchHabits();
            }}
          />
        )}
        {editingHabit && (
          <HabitFormModal
            habit={editingHabit}
            onClose={() => setEditingHabit(null)}
            onSuccess={() => {
              setEditingHabit(null);
              fetchHabits();
            }}
          />
        )}
        {showPresetModal && (
          <PresetModal
            presets={presets}
            loading={presetsLoading}
            applyingId={applyingPresetId}
            onApply={handleApplyPreset}
            onClose={() => setShowPresetModal(false)}
          />
        )}
      </AnimatePresence>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={habitToDelete?.name || ''}
        loading={deleteLoading}
      />

      <DeleteConfirmModal
        isOpen={deleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        onConfirm={confirmDeleteAll}
        itemName="all habits"
        loading={deleteAllLoading}
      />
    </motion.div>
  );
}

function SortableHabitCard({ habit, index, onDelete, onEdit }: { 
  habit: Habit; 
  index: number;
  onDelete: (h: Habit) => void; 
  onEdit: (h: Habit) => void; 
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`group bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:border-blue-500/20 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 ${isDragging ? 'shadow-2xl ring-2 ring-blue-600 border-transparent scale-105' : ''}`}
    >
      <div className="flex justify-between items-start mb-8">
        <div {...attributes} {...listeners} className="p-3 -m-3 cursor-grab active:cursor-grabbing text-slate-200 hover:text-blue-600 transition-all">
          <GripVertical size={24} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(habit)} className="p-3 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all duration-300">
            <Edit size={18} />
          </button>
          <button onClick={() => onDelete(habit)} className="p-3 bg-slate-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all duration-300">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-black tracking-[0.3em] text-blue-500 uppercase">{habit.category}</span>
          <h3 className="text-2xl font-bold text-slate-900 mt-2 leading-none tracking-tight">{habit.name}</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Current Streak</span>
            <span className="text-blue-600">{habit.streak || 0} Days</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((habit.streak || 0) * 10, 100)}%` }}
              className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.2)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {habit.steps?.slice(0, 3).map((step, i) => (
            <span key={i} className="text-[9px] font-black bg-slate-100 text-slate-900 px-3 py-1.5 rounded-xl uppercase tracking-widest">
              {step.name}
            </span>
          ))}
          {(habit.steps?.length || 0) > 3 && (
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">+{habit.steps!.length - 3} More</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function HabitFormModal({ habit, onClose, onSuccess }: { habit?: Habit; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(habit?.name || '');
  const [category, setCategory] = useState(habit?.category || 'Health');
  const [type, setType] = useState(habit?.type || 'single-step');
  const [steps, setSteps] = useState(habit?.steps || [{ order: 0, name: '' }]);
  const [schedule, setSchedule] = useState(habit?.schedule || { weekdays: true, weekends: true });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name,
        category,
        type,
        steps: type === 'single-step' ? [{ order: 0, name }] : steps.filter(s => s.name.trim()),
        targetPerDay: 1,
        schedule
      };
      
      const url = habit ? `/api/habits/${habit.id}` : '/api/habits';
      const method = habit ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 sm:p-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{habit ? 'Update Habit' : 'New Habit'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Habit Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Drink Water"
                className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white rounded-2xl px-6 py-4 font-semibold text-slate-900 outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white rounded-2xl px-6 py-4 font-semibold text-slate-900 outline-none transition-all appearance-none"
                >
                  <option value="Health">Health</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Mindfulness">Mindfulness</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Diet">Diet</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white rounded-2xl px-6 py-4 font-semibold text-slate-900 outline-none transition-all appearance-none"
                >
                  <option value="single-step">Simple</option>
                  <option value="multi-step">Multi-Step</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Schedule</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSchedule({ ...schedule, weekdays: !schedule.weekdays })}
                  className={`flex-1 py-4 rounded-2xl font-bold text-xs transition-all border-2 ${
                    schedule.weekdays 
                      ? 'bg-blue-50 border-blue-600 text-blue-600' 
                      : 'bg-slate-50 border-transparent text-slate-400'
                  }`}
                >
                  WEEKDAYS
                </button>
                <button
                  type="button"
                  onClick={() => setSchedule({ ...schedule, weekends: !schedule.weekends })}
                  className={`flex-1 py-4 rounded-2xl font-bold text-xs transition-all border-2 ${
                    schedule.weekends 
                      ? 'bg-blue-50 border-blue-600 text-blue-600' 
                      : 'bg-slate-50 border-transparent text-slate-400'
                  }`}
                >
                  WEEKENDS
                </button>
              </div>
            </div>

            {type === 'multi-step' && (
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Steps</label>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => {
                          const newSteps = [...steps];
                          newSteps[idx].name = e.target.value;
                          setSteps(newSteps);
                        }}
                        placeholder={`Step ${idx + 1}`}
                        className="flex-1 bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white rounded-xl px-4 py-2 font-semibold text-slate-900 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSteps([...steps, { order: steps.length, name: '' }])}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  + ADD STEP
                </button>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Not now
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {loading ? 'Saving...' : habit ? 'Save Changes' : 'Add to Routine'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function PresetModal({ presets, loading, applyingId, onApply, onClose }: any) {
  const [search, setSearch] = useState('');

  const filtered = presets.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="bg-slate-900 p-8 sm:p-10 text-white relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 blur-[2px] animate-scan" />
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Great Ideas</h2>
              <p className="text-slate-400 font-medium">Proven routines to help you grow.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search routines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border-2 border-transparent focus:border-blue-500 focus:bg-white/20 rounded-2xl pl-12 pr-6 py-4 font-semibold text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="p-8 sm:p-10 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((preset: any) => (
                <div 
                  key={preset.id}
                  className="group bg-slate-50 border-2 border-transparent hover:border-blue-500/20 rounded-[2rem] p-6 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{preset.category || 'GENERAL'}</span>
                    <Sparkles size={18} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{preset.name}</h3>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-blue-100" />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Loved by users</span>
                  </div>
                  <button
                    onClick={() => onApply(preset.id)}
                    disabled={applyingId === preset.id}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {applyingId === preset.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Add this routine'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
