'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Habit } from '@/types';
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, X, Layers } from 'lucide-react';
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

          {/* Preset Selection Modal */}
          {showPresetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Choose a Preset</h2>
                  <button
                    onClick={() => setShowPresetModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                {presetsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : presets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No presets available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {presets.map((preset) => (
                      <div
                        key={preset.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">{preset.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{preset.type}</p>
                        <button
                          onClick={() => handleApplyPreset(preset.id)}
                          disabled={applyingPresetId === preset.id}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {applyingPresetId === preset.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Applying...
                            </>
                          ) : (
                            'Apply Preset'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowPresetModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    Cancel
                  </button>
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/presets-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const applyTemplate = (template: any) => {
    // Pre-populate the form with template data
    setName(template.name || '');
    setCategory(template.category || 'Health');
    setType(template.type || 'single-step');
    
    if (template.habits && template.habits.length > 0) {
      // If template has multiple habits, we'll just use the first one for this single habit creation
      const firstHabit = template.habits[0];
      setType(firstHabit.type || 'single-step');
      if (firstHabit.steps && firstHabit.steps.length > 0) {
        setSteps(firstHabit.steps.map((step: any, idx: number) => ({ order: idx, name: step.name || step })));
      } else {
        setSteps([{ order: 0, name: firstHabit.name || '' }]);
      }
    } else {
      setSteps([{ order: 0, name: template.name || '' }]);
    }
    
    setShowTemplates(false);
  };

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
              onClick={async () => {
                await fetchTemplates();
                setShowTemplates(true);
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
            >
              <Layers size={16} />
              Use Template
            </button>
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

          {/* Template Selection Modal */}
          {showTemplates && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Choose a Template</h3>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                {templatesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No templates available</p>
                    <button
                      onClick={() => {
                        setShowTemplates(false);
                        window.open('/presets-templates', '_blank');
                      }}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      Visit Templates Page
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template._id}
                        className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => applyTemplate(template)}
                      >
                        <h4 className="font-semibold text-gray-900 mb-1">{template.displayName}</h4>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="flex gap-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {template.category || template.type}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {template.habits?.length || 0} habits
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
