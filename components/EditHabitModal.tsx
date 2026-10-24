'use client';

import { useState, useEffect } from 'react';
import { Habit } from '@/types';
import { X, Sparkles, Target, Zap, FileText, Calendar, Loader2, Plus, Trash2, Bell, Clock, ListChecks, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface EditHabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = [
  { value: 'Health', label: 'Health', icon: '💚' },
  { value: 'Fitness', label: 'Fitness', icon: '💪' },
  { value: 'Productivity', label: 'Productivity', icon: '⚡' },
  { value: 'Mindfulness', label: 'Mindfulness', icon: '🧘' },
  { value: 'Growth', label: 'Growth', icon: '🌱' },
  { value: 'Diet', label: 'Diet', icon: '🥗' },
  { value: 'Finance', label: 'Finance', icon: '💰' },
  { value: 'Social', label: 'Social', icon: '🤝' },
  { value: 'Other', label: 'Other', icon: '✨' },
];

const weekDays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function EditHabitModal({ habit, isOpen, onClose, onSuccess }: EditHabitModalProps) {
  const [loading, setLoading] = useState(false);
  const [newStepText, setNewStepText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Health',
    type: 'single-step' as 'single-step' | 'multi-step' | 'measurable' | 'timer' | 'advanced',
    steps: [{ name: '', order: 0 }],
    targetPerDay: 1,
    description: '',
    descriptionEnabled: false,
    advancedMode: false,
    subActivities: [] as Array<{ name: string; type: string }>,
    schedule: { weekdays: true, weekends: true, custom: [] as number[] },
    reminderEnabled: false,
    reminderTime: '08:00',
    sendRemainder: false,
  });

  useEffect(() => {
    if (habit && isOpen) {
      setNewStepText('');
      setFormData({
        name: habit.name || '',
        category: habit.category || 'Health',
        type: habit.type || 'single-step',
        steps: habit.steps && habit.steps.length > 0 ? habit.steps : [{ name: '', order: 0 }],
        targetPerDay: habit.targetPerDay || 1,
        // @ts-ignore
        description: habit.description || '',
        // @ts-ignore
        descriptionEnabled: habit.descriptionEnabled || false,
        // @ts-ignore
        advancedMode: habit.advancedMode || false,
        // @ts-ignore
        subActivities: habit.subActivities || [],
        schedule: {
          weekdays: habit.schedule?.weekdays ?? true,
          weekends: habit.schedule?.weekends ?? true,
          custom: habit.schedule?.custom ?? [],
        },
        reminderEnabled: habit.reminderEnabled || false,
        reminderTime: habit.reminderTime || '08:00',
        sendRemainder: habit.sendRemainder || false,
      });
    }
  }, [habit, isOpen]);

  if (!isOpen || !habit) return null;

  const toggleCustomDay = (day: number) => {
    const custom = formData.schedule.custom || [];
    const newCustom = custom.includes(day)
      ? custom.filter(d => d !== day)
      : [...custom, day];
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, custom: newCustom }
    });
  };

  const addStep = () => setFormData({ ...formData, steps: [...formData.steps, { name: '', order: formData.steps.length }] });
  const removeStep = (index: number) => setFormData({ ...formData, steps: formData.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })) });
  const updateStep = (index: number, name: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], name };
    setFormData({ ...formData, steps: newSteps });
  };

  const handleAddStepFromInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newStepText.trim();
    if (!trimmed) return;
    const valid = formData.steps.filter(s => s.name.trim().length > 0);
    setFormData({
      ...formData,
      steps: [...valid, { name: trimmed, order: valid.length }]
    });
    setNewStepText('');
  };

  const moveStepUp = (index: number) => {
    if (index <= 0) return;
    const newSteps = [...formData.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    setFormData({ ...formData, steps: newSteps.map((s, i) => ({ ...s, order: i })) });
  };

  const moveStepDown = (index: number) => {
    if (index >= formData.steps.length - 1) return;
    const newSteps = [...formData.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    setFormData({ ...formData, steps: newSteps.map((s, i) => ({ ...s, order: i })) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a habit name');
      return;
    }

    if (formData.type === 'multi-step' && formData.steps.some(s => !s.name.trim())) {
      toast.error('Please fill in all steps');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          type: formData.type,
          steps: formData.type === 'single-step' ? [{ name: formData.name.trim(), order: 0 }] : formData.steps.filter(s => s.name.trim()).map((s, i) => ({ ...s, order: i })),
          targetPerDay: formData.targetPerDay,
          description: formData.descriptionEnabled ? formData.description.trim() : '',
          descriptionEnabled: formData.descriptionEnabled,
          schedule: formData.schedule,
          advancedMode: formData.advancedMode,
          subActivities: formData.subActivities,
          reminderEnabled: formData.reminderEnabled,
          reminderTime: formData.reminderTime,
          sendRemainder: formData.sendRemainder,
        })
      });

      if (res.ok) {
        toast.success('Habit updated successfully!');
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update habit');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="edit-habit-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col max-h-full overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-900 z-10 sticky top-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="text-white w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Edit Habit</h3>
                <p className="text-[10px] sm:text-xs font-medium text-zinc-500">Modify your ritual settings</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 85px)' }}>
            <form id="edit-habit-form" onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Name */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Habit Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Meditation"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-2.5 sm:py-3 px-4 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">Category</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-1.5 sm:p-2 rounded-xl border-2 transition-all text-center ${formData.category === cat.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                    >
                      <div className="text-base sm:text-lg mb-0.5 sm:mb-1">{cat.icon}</div>
                      <div className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wide leading-tight ${formData.category === cat.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500'}`}>{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Toggle */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-indigo-500" />
                    <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add Description</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, descriptionEnabled: !formData.descriptionEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${formData.descriptionEnabled ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${formData.descriptionEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                {formData.descriptionEnabled && (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Why this habit matters..."
                    rows={2}
                    className="w-full mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                )}
              </div>

              {/* Type Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'single-step' })}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${formData.type === 'single-step' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <Zap size={20} className={formData.type === 'single-step' ? 'text-indigo-600' : 'text-zinc-400'} />
                  <span className={`text-sm font-bold mt-1 ${formData.type === 'single-step' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500'}`}>Simple</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'multi-step' })}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${formData.type === 'multi-step' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <Target size={20} className={formData.type === 'multi-step' ? 'text-indigo-600' : 'text-zinc-400'} />
                  <span className={`text-sm font-bold mt-1 ${formData.type === 'multi-step' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500'}`}>Multi-Step</span>
                </button>
              </div>

              {/* Multi-Step Checklist Builder */}
              {formData.type === 'multi-step' && (
                <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200 dark:border-zinc-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks size={14} className="text-indigo-500" />
                      <span>Checklist Tasks ({formData.steps.filter(s => s.name.trim()).length})</span>
                    </label>
                  </div>

                  {/* Add Task Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add sub-task & press Enter..."
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStepFromInput();
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddStepFromInput()}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Task List */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pt-1">
                    {formData.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800"
                      >
                        <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(idx, e.target.value)}
                          placeholder={`Task ${idx + 1}...`}
                          className="flex-1 bg-transparent border-0 text-xs font-medium text-slate-900 dark:text-white outline-none"
                        />
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveStepUp(idx)}
                            disabled={idx === 0}
                            className={`p-1 rounded ${idx === 0 ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStepDown(idx)}
                            disabled={idx === formData.steps.length - 1}
                            className={`p-1 rounded ${idx === formData.steps.length - 1 ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Mode Toggle */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.advancedMode ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                      <Zap size={18} className={formData.advancedMode ? 'text-white' : 'text-zinc-500'} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Advanced Mode</h3>
                      <p className="text-[10px] text-zinc-500">Enable deep tracking & sub-activities</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, advancedMode: !formData.advancedMode })}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${formData.advancedMode ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${formData.advancedMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {formData.advancedMode && (
                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Default Sub-Activities</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, subActivities: [...formData.subActivities, { name: '', type: 'text' }] })}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Activity
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {formData.subActivities.map((sub, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder="Activity name"
                              value={sub.name}
                              onChange={(e) => {
                                const newSubs = [...formData.subActivities];
                                newSubs[idx].name = e.target.value;
                                setFormData({ ...formData, subActivities: newSubs });
                              }}
                              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1 text-xs"
                            />
                            <select
                              value={sub.type}
                              onChange={(e) => {
                                const newSubs = [...formData.subActivities];
                                newSubs[idx].type = e.target.value;
                                setFormData({ ...formData, subActivities: newSubs });
                              }}
                              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[10px]"
                            >
                              <option value="text">Text Input</option>
                              <option value="kg">Weight (kg)</option>
                              <option value="reps">Reps</option>
                              <option value="duration">Time (min)</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, subActivities: formData.subActivities.filter((_, i) => i !== idx) })}
                            className="p-1.5 text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {formData.subActivities.length === 0 && (
                        <p className="text-[10px] text-zinc-400 text-center py-2 opacity-60">No default sub-activities.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Steps */}
              {formData.type === 'multi-step' && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Steps</label>
                    <button type="button" onClick={addStep} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <Plus size={14} /> Add Step
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600">{index + 1}</span>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(index, e.target.value)}
                          className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                        />
                        {formData.steps.length > 1 && (
                          <button type="button" onClick={() => removeStep(index)} className="text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  <Calendar size={16} /> Schedule
                </label>
                <div className="flex items-center gap-3">
                  {['Weekdays', 'Weekends'].map((label) => {
                    const key = label.toLowerCase() as 'weekdays' | 'weekends';
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFormData({ ...formData, schedule: { ...formData.schedule, [key]: !formData.schedule[key] } })}
                        className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${formData.schedule[key] ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleCustomDay(day.value)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${formData.schedule.custom?.includes(day.value) ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Habit Reminder & Notifications */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.reminderEnabled ? 'bg-indigo-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                      <Bell size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Habit Reminder</p>
                      <p className="text-[10px] text-zinc-500">Device notification alert</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${formData.reminderEnabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${formData.reminderEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {formData.reminderEnabled && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Clock size={14} className="text-indigo-500" /> Reminder Time
                      </label>
                      <input
                        type="time"
                        value={formData.reminderTime}
                        onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={formData.sendRemainder}
                        onChange={(e) => setFormData({ ...formData, sendRemainder: e.target.checked })}
                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Keep alert active until checked off (gentle re-alert)</span>
                    </label>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Footer Submit */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/30 flex justify-end gap-3 rounded-b-3xl shrink-0">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              form="edit-habit-form"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
