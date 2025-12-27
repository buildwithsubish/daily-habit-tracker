'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Habit } from '@/types';
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, X, Layers, Search, Filter, Sparkles } from 'lucide-react';
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
  const [presetSearchTerm, setPresetSearchTerm] = useState('');
  const [selectedPresetCategory, setSelectedPresetCategory] = useState('all');

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

  const getPresetCategory = (preset: any) => {
    const type = preset.type?.toLowerCase();
    if (type.includes('gym') || type.includes('fitness') || type.includes('weight')) return 'Fitness';
    if (type.includes('diet') || type.includes('nutrition') || type.includes('bulk')) return 'Diet';
    if (type.includes('mental') || type.includes('mindfulness') || type.includes('meditation')) return 'Mindfulness';
    if (type.includes('productivity') || type.includes('study') || type.includes('learning')) return 'Productivity';
    if (type.includes('health') || type.includes('morning') || type.includes('evening')) return 'Health';
    return 'General';
  };

  const getPresetIcon = (preset: any) => {
    const type = preset.type?.toLowerCase();
    if (type.includes('gym') || type.includes('fitness')) return '🏋️';
    if (type.includes('diet') || type.includes('nutrition')) return '🥗';
    if (type.includes('mental') || type.includes('mindfulness')) return '🧘';
    if (type.includes('productivity') || type.includes('study')) return '📚';
    if (type.includes('morning')) return '🌅';
    if (type.includes('evening')) return '🌙';
    if (type.includes('health')) return '💊';
    return '⚡';
  };

  const getPresetDescription = (preset: any) => {
    const descriptions: Record<string, string> = {
      'weekday': 'Complete daily routine for productive weekdays',
      'sunday': 'Relaxed Sunday routine for reflection and planning',
      'gym': 'Structured workout plan for strength and fitness',
      'diet': 'Healthy eating habits and nutrition tracking',
      'morning-productivity': 'Powerful morning routine to start your day',
      'evening-winddown': 'Peaceful evening routine for better sleep',
      'study-learning': 'Focused learning and study habits',
      'weight-loss': 'Healthy habits for weight management',
      'mental-health': 'Wellness habits for mental health',
      'lean-bulk': 'Nutrition plan for lean muscle building'
    };
    return descriptions[preset.type] || 'Pre-built habit collection';
  };

  const getHabitCount = (preset: any) => {
    return preset.structure?.habits?.length || 0;
  };

  const getFilteredPresets = () => {
    let filtered = presets;
    
    // Filter by category
    if (selectedPresetCategory !== 'all') {
      filtered = filtered.filter(preset => getPresetCategory(preset) === selectedPresetCategory);
    }
    
    // Filter by search term
    if (presetSearchTerm) {
      const searchLower = presetSearchTerm.toLowerCase();
      filtered = filtered.filter(preset => 
        preset.name?.toLowerCase().includes(searchLower) ||
        preset.type?.toLowerCase().includes(searchLower) ||
        getPresetDescription(preset).toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  const getUniqueCategories = () => {
    const categories = presets.map(getPresetCategory);
    return [...new Set(categories)].sort();
  };

  const handleApplyPreset = async (presetId: string) => {
    setApplyingPresetId(presetId);
    try {
      // Find the preset to get its name
      const preset = presets.find(p => p.id === presetId);
      if (!preset) {
        console.error('Preset not found');
        return;
      }

      const res = await fetch('/api/presets/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ presetName: preset.name }),
      });
      
      if (res.ok) {
        setShowPresetModal(false);
        fetchHabits(); // Refresh habits to show new ones from preset
      } else {
        const error = await res.json();
        console.error('Failed to apply preset:', error);
        alert(`Failed to apply preset: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
      alert('Failed to apply preset. Please try again.');
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



  return (
    <div className="space-y-6 pt-24 sm:pt-26 lg:pt-28">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">My Habits</h1>
            <div className="flex gap-2">
              {habits.length > 0 && (
                <button
                  onClick={() => setDeleteAllModalOpen(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 size={20} />
                  Delete All
                </button>
              )}
              <button
                onClick={async () => {
                  await fetchPresets();
                  setShowPresetModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Layers size={20} />
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
              <p className="text-gray-500 mb-4">No habits yet. Create your first habit!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                Create Habit
              </button>
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
                      deleting={deleteLoading && habitToDelete?.id === habit.id}
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



          {/* Delete Confirmation Modal */}
          <DeleteConfirmModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setHabitToDelete(null);
            }}
            onConfirm={confirmDelete}
            itemName={habitToDelete?.name || ''}
            loading={deleteLoading}
          />

          {/* Delete All Confirmation Modal */}
          <DeleteConfirmModal
            isOpen={deleteAllModalOpen}
            onClose={() => setDeleteAllModalOpen(false)}
            onConfirm={confirmDeleteAll}
            itemName={`all ${habits.length} habits`}
            loading={deleteAllLoading}
          />

          {/* Enhanced Preset Selection Modal */}
          {showPresetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles size={28} />
                      <h2 className="text-2xl font-bold">Choose a Preset</h2>
                    </div>
                    <button
                      onClick={() => {
                        setShowPresetModal(false);
                        setPresetSearchTerm('');
                        setSelectedPresetCategory('all');
                      }}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <p className="text-blue-100">Pre-built habit collections to jumpstart your journey</p>
                </div>

                {/* Search and Filter Section */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search presets..."
                        value={presetSearchTerm}
                        onChange={(e) => setPresetSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <div className="relative">
                      <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={selectedPresetCategory}
                        onChange={(e) => setSelectedPresetCategory(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
                      >
                        <option value="all">All Categories</option>
                        {getUniqueCategories().map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Presets Grid */}
                <div className="p-6">
                  {presetsLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading presets...</p>
                      </div>
                    </div>
                  ) : getFilteredPresets().length === 0 ? (
                    <div className="text-center py-12">
                      <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No presets found</h3>
                      <p className="text-gray-500">
                        {presetSearchTerm || selectedPresetCategory !== 'all' 
                          ? 'Try adjusting your search or filter criteria'
                          : 'No presets available at the moment'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredPresets().map((preset) => (
                        <div
                          key={preset.id}
                          className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 overflow-hidden group"
                        >
                          {/* Preset Header */}
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getPresetIcon(preset)}</span>
                                <span className="text-xs font-semibold px-2 py-1 bg-white rounded-full text-gray-700">
                                  {getPresetCategory(preset)}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {getHabitCount(preset)} habits
                              </span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">
                              {preset.name}
                            </h3>
                          </div>

                          {/* Preset Content */}
                          <div className="p-4">
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                              {getPresetDescription(preset)}
                            </p>

                            {/* Habit Preview */}
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Includes:</p>
                              <div className="space-y-1">
                                {preset.structure?.habits?.slice(0, 3).map((habit: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                                    <span className="truncate">{habit.name}</span>
                                  </div>
                                ))}
                                {preset.structure?.habits?.length > 3 && (
                                  <p className="text-xs text-gray-400 italic">
                                    +{preset.structure.habits.length - 3} more habits
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <button
                              onClick={() => handleApplyPreset(preset.id)}
                              disabled={applyingPresetId === preset.id}
                              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center justify-center gap-2"
                            >
                              {applyingPresetId === preset.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Applying...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={16} />
                                  Apply Preset
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      {getFilteredPresets().length} preset{getFilteredPresets().length !== 1 ? 's' : ''} available
                    </p>
                    <button
                      onClick={() => {
                        setShowPresetModal(false);
                        setPresetSearchTerm('');
                        setSelectedPresetCategory('all');
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
              {loading ? 'Creating...' : habit ? 'Update Habit' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SortableHabitCard({ habit, onDelete, onEdit, deleting }: { habit: Habit; onDelete: (habit: Habit) => void; onEdit: (habit: Habit) => void; deleting?: boolean }) {
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
              type="button"
              onPointerDown={(e) => {
                // Prevent drag-kit from starting a drag when interacting with this button
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(habit);
              }}
              className="text-blue-500 hover:text-blue-700 active:scale-95 transition-all duration-200 touch-manipulation p-1.5 hover:bg-blue-50 rounded-lg"
              title="Edit"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              <Edit size={18} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!deleting) {
                  onDelete(habit);
                }
              }}
              className={`text-red-500 hover:text-red-700 active:scale-95 transition-all duration-200 touch-manipulation p-1.5 hover:bg-red-50 rounded-lg ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Delete"
              disabled={deleting}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Trash2 size={18} />
              )}
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
