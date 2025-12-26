'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Habit, Preset } from '@/types';
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, X } from 'lucide-react';
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
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHabits();
    fetchPresets();
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
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const handleDelete = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    try {
      await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
      fetchHabits();
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = habits.findIndex((habit) => habit.id === active.id);
      const newIndex = habits.findIndex((habit) => habit.id === over.id);

      const newHabits = arrayMove(habits, oldIndex, newIndex);
      setHabits(newHabits);

      // Save new order permanently to database
      try {
        const habitIds = newHabits.map(h => h.id);
        await fetch('/api/habits/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ habitIds }),
        });
      } catch (error) {
        console.error('Failed to save order:', error);
        // Revert on error
        fetchHabits();
      }
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    try {
      await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });
      setShowPresetModal(false);
      fetchHabits();
    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">My Habits</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPresetModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus size={20} />
                Use Preset
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus size={20} />
                Create Habit
              </button>
            </div>
          </div>

          {habits.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 mb-4">No habits yet. Create your first habit or use a preset!</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowPresetModal(true)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                >
                  Use Preset
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                >
                  Create Habit
                </button>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {habits.map(habit => (
                    <SortableHabitCard
                      key={habit.id}
                      habit={habit}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {showCreateModal && (
            <CreateHabitModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false);
                fetchHabits();
              }}
            />
          )}

          {editingHabit && (
            <CreateHabitModal
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
              onClose={() => setShowPresetModal(false)}
              onApply={handleApplyPreset}
            />
          )}
        </>
      )}
    </div>
  );
}

function CreateHabitModal({ onClose, onSuccess, habit }: { onClose: () => void; onSuccess: () => void; habit?: Habit }) {
  const [name, setName] = useState(habit?.name || '');
  const [category, setCategory] = useState<'Health' | 'Productivity' | 'Mindfulness' | 'Fitness' | 'Diet'>(habit?.category || 'Health');
  const [type, setType] = useState<'single-step' | 'multi-step'>(habit?.type || 'single-step');
  const [steps, setSteps] = useState(habit?.steps || [{ order: 0, name: '' }]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (habit) {
        // Update existing habit
        await fetch(`/api/habits/${habit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            type,
            steps: type === 'single-step' ? [{ order: 0, name }] : steps.map((s, idx) => ({ ...s, order: idx })).filter(s => s.name.trim()),
            targetPerDay: habit.targetPerDay,
            schedule: habit.schedule,
          }),
        });
      } else {
        // Create new habit
        await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            type,
            steps: type === 'single-step' ? [{ order: 0, name }] : steps.map((s, idx) => ({ ...s, order: idx })).filter(s => s.name.trim()),
            targetPerDay: 1,
            schedule: { weekdays: true, weekends: true },
          }),
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save habit:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setSteps([...steps, { order: steps.length, name: '' }]);
  };

  const updateStep = (index: number, name: string) => {
    const newSteps = [...steps];
    newSteps[index].name = name;
    setSteps(newSteps);
  };

  const moveStepUp = (index: number) => {
    if (index > 0) {
      const newSteps = [...steps];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      setSteps(newSteps);
    }
  };

  const moveStepDown = (index: number) => {
    if (index < steps.length - 1) {
      const newSteps = [...steps];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      setSteps(newSteps);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{habit ? 'Edit Habit' : 'Create New Habit'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
            >
              <option value="Health">Health</option>
              <option value="Productivity">Productivity</option>
              <option value="Mindfulness">Mindfulness</option>
              <option value="Fitness">Fitness</option>
              <option value="Diet">Diet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
            >
              <option value="single-step">Single Step</option>
              <option value="multi-step">Multi-Step</option>
            </select>
          </div>

          {type === 'multi-step' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Steps</label>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="flex items-center text-gray-500 w-6">{idx + 1}.</span>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(idx, e.target.value)}
                      placeholder={`Step ${idx + 1} description`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveStepUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStepDown(idx)}
                        disabled={idx === steps.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addStep}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  + Add Step
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PresetModal({ presets, onClose, onApply }: { presets: Preset[]; onClose: () => void; onApply: (id: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 text-gray-500 hover:text-gray-700 touch-manipulation"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 pr-8">Choose a Preset</h2>
        <div className="space-y-3">
          {presets.map(preset => (
            <div
              key={preset.id}
              className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all duration-200 hover-lift"
              onClick={() => onApply(preset.id)}
            >
              <h3 className="font-bold text-gray-900 text-base sm:text-lg">{preset.name}</h3>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {preset.structure.habits.length} habits included
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function SortableHabitCard({ habit, onDelete, onEdit }: { habit: Habit; onDelete: (id: string) => void; onEdit: (habit: Habit) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-move">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{habit.name}</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-1">
              {habit.category}
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(habit);
              }}
              className="text-blue-500 hover:text-blue-700"
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(habit.id);
              }}
              className="text-red-500 hover:text-red-700"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          Type: {habit.type === 'single-step' ? 'Single Step' : 'Multi-Step'}
        </p>
        {habit.type === 'multi-step' && (
          <p className="text-sm text-gray-600">
            Steps: {habit.steps.length}
          </p>
        )}
      </div>
    </div>
  );
}
