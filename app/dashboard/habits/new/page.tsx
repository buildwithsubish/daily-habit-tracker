'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Sparkles, 
  Zap, 
  Target, 
  Calendar, 
  Dumbbell, 
  ListChecks, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Heart, 
  Brain, 
  Sprout, 
  Salad, 
  Wallet, 
  Users, 
  Bell, 
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const ROUTINE_PRESETS = [
  {
    name: 'Morning Routine',
    category: 'Mindfulness',
    steps: ['Hydrate 500ml water', '5-minute mobility & stretching', 'Mindful meditation (10 min)', 'Review 3 priority tasks for today'],
  },
  {
    name: 'PPL: Push Workout',
    category: 'Fitness',
    steps: ['Warm-up & rotator cuff', 'Flat Barbell Bench Press (4 sets)', 'Incline Dumbbell Press (3 sets)', 'Overhead Dumbbell Press (3 sets)', 'Lateral Raises & Triceps (4 sets)'],
  },
  {
    name: 'PPL: Pull Workout',
    category: 'Fitness',
    steps: ['Deadlifts / Warmup (3 sets)', 'Barbell Rows (4 sets)', 'Lat Pulldowns (3 sets)', 'Face Pulls for rear delts (3 sets)', 'Incline Bicep Curls (4 sets)'],
  },
  {
    name: 'PPL: Leg Workout',
    category: 'Fitness',
    steps: ['Hip mobility & leg extensions', 'Barbell Squats (4 sets)', 'Romanian Deadlifts (3 sets)', 'Leg Press (3 sets)', 'Standing Calf Raises (4 sets)'],
  },
  {
    name: 'Evening Wind-down',
    category: 'Health',
    steps: ['Screens turned off (1 hour before bed)', 'Prepare tomorrow’s clothes & gym gear', 'Read 15 pages of a book', 'Dim lighting & magnesium tea'],
  },
];

export default function NewHabitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newStepText, setNewStepText] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Health' as string,
    type: 'single-step' as 'single-step' | 'multi-step',
    steps: [{ name: '', order: 0 }],
    targetPerDay: 1,
    description: '',
    descriptionEnabled: false,
    schedule: {
      weekdays: true,
      weekends: true,
      custom: [] as number[],
    },
    inactiveAlertDays: 3,
    reminderEnabled: false,
    reminderTime: '08:00',
    sendRemainder: false,
  });

  const categories = [
    { value: 'Health', label: 'Health', icon: Heart, color: 'text-rose-500' },
    { value: 'Fitness', label: 'Fitness', icon: Dumbbell, color: 'text-orange-500' },
    { value: 'Productivity', label: 'Productivity', icon: Zap, color: 'text-blue-500' },
    { value: 'Mindfulness', label: 'Mindfulness', icon: Brain, color: 'text-purple-500' },
    { value: 'Growth', label: 'Growth', icon: Sprout, color: 'text-emerald-500' },
    { value: 'Diet', label: 'Diet', icon: Salad, color: 'text-lime-600' },
    { value: 'Finance', label: 'Finance', icon: Wallet, color: 'text-teal-600' },
    { value: 'Social', label: 'Social', icon: Users, color: 'text-cyan-600' },
    { value: 'Other', label: 'Other', icon: Sparkles, color: 'text-slate-500' },
  ];

  const weekDays = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
  ];

  // Convenient Step / Multi-tasking management
  const handleAddStepFromInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newStepText.trim();
    if (!trimmed) return;

    // Filter out initial empty placeholder if present
    const validSteps = formData.steps.filter(s => s.name.trim().length > 0);
    setFormData({
      ...formData,
      steps: [...validSteps, { name: trimmed, order: validSteps.length }],
    });
    setNewStepText('');
  };

  const removeStep = (index: number) => {
    const updated = formData.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    setFormData({
      ...formData,
      steps: updated.length > 0 ? updated : [{ name: '', order: 0 }],
    });
  };

  const moveStepUp = (index: number) => {
    if (index <= 0) return;
    const newSteps = [...formData.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    setFormData({
      ...formData,
      steps: newSteps.map((s, i) => ({ ...s, order: i })),
    });
  };

  const moveStepDown = (index: number) => {
    if (index >= formData.steps.length - 1) return;
    const newSteps = [...formData.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    setFormData({
      ...formData,
      steps: newSteps.map((s, i) => ({ ...s, order: i })),
    });
  };

  const updateStepText = (index: number, val: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], name: val };
    setFormData({ ...formData, steps: newSteps });
  };

  // Quick apply routine preset
  const applyPreset = (preset: typeof ROUTINE_PRESETS[0]) => {
    setFormData({
      ...formData,
      name: formData.name || preset.name,
      category: preset.category,
      type: 'multi-step',
      steps: preset.steps.map((text, i) => ({ name: text, order: i })),
    });
    toast.success(`Applied "${preset.name}" preset!`, { icon: '✨' });
  };

  const toggleCustomDay = (day: number) => {
    const custom = formData.schedule.custom || [];
    const newCustom = custom.includes(day)
      ? custom.filter(d => d !== day)
      : [...custom, day];
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, custom: newCustom },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a habit name');
      return;
    }

    if (formData.type === 'multi-step') {
      const validSteps = formData.steps.filter(s => s.name.trim());
      if (validSteps.length === 0) {
        toast.error('Please add at least one task to your multi-task checklist');
        return;
      }
    }

    setLoading(true);

    try {
      const finalSteps = formData.type === 'single-step'
        ? [{ name: formData.name.trim(), order: 0 }]
        : formData.steps.filter(s => s.name.trim()).map((s, i) => ({ ...s, order: i }));

      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          type: formData.type,
          steps: finalSteps,
          targetPerDay: formData.targetPerDay,
          description: formData.descriptionEnabled ? formData.description.trim() : '',
          descriptionEnabled: formData.descriptionEnabled,
          schedule: formData.schedule,
          inactiveAlertDays: formData.inactiveAlertDays,
          reminderEnabled: formData.reminderEnabled,
          reminderTime: formData.reminderTime,
          sendRemainder: formData.sendRemainder,
        }),
      });

      if (res.ok) {
        toast.success('Habit created successfully! 🎉');
        router.push('/dashboard/habits');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create habit');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Habits</span>
        </button>

        {/* Header */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Ritual Builder
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create New Habit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Configure single actions or comprehensive multi-tasking checklists.
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Habit Identity Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Habit Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Morning Gym Push Day, Deep Work, Daily Reading..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>

            {/* Description Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Include goal notes or motivation
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, descriptionEnabled: !formData.descriptionEnabled })}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {formData.descriptionEnabled ? 'Remove Notes' : '+ Add Notes'}
                </button>
              </div>

              {formData.descriptionEnabled && (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Why does this habit matter? What is your target standard?"
                  rows={2}
                  className="mt-2 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 resize-none"
                />
              )}
            </div>
          </div>

          {/* 2. Category Picker */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = formData.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon size={18} className={`mb-1.5 ${cat.color}`} />
                    <span className="text-[11px] font-bold">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Habit Mode: Simple Single Action vs Multi-tasking Checklist */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Habit Workflow
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'single-step' })}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  formData.type === 'single-step'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500 shadow-sm'
                    : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-lg ${formData.type === 'single-step' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500'}`}>
                  <Zap size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Single Action</div>
                  <div className="text-[11px] opacity-80 mt-0.5">One click marks the ritual completed for the day.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'multi-step' })}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  formData.type === 'multi-step'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500 shadow-sm'
                    : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-lg ${formData.type === 'multi-step' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500'}`}>
                  <ListChecks size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Multi-Tasking Checklist</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Break down into sub-tasks, exercise sets, or checklists.</div>
                </div>
              </button>
            </div>

            {/* Multi-Tasking Checklist Builder */}
            {formData.type === 'multi-step' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-4"
              >
                {/* Routine Presets Shortcuts */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Bookmark size={13} className="text-indigo-500" />
                    <span>Quick Routine Presets:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ROUTINE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors border border-slate-200 dark:border-zinc-700"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Convenient Quick Add Task Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Add Checklist Task (Type & press Enter)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g., Flat Bench Press 4 sets of 10 reps..."
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStepFromInput();
                        }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddStepFromInput()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      Add Task
                    </button>
                  </div>
                </div>

                {/* Task List with Position Arranging */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <span>Tasks ({formData.steps.filter(s => s.name.trim()).length})</span>
                    <span>Arrange & Reorder</span>
                  </div>

                  <div className="space-y-2">
                    {formData.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/70"
                      >
                        {/* Step Number */}
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Editable Name */}
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStepText(idx, e.target.value)}
                          placeholder={`Task ${idx + 1}...`}
                          className="flex-1 bg-transparent border-0 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-0"
                        />

                        {/* Reorder Buttons (Move Up / Down) */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveStepUp(idx)}
                            disabled={idx === 0}
                            title="Move Up"
                            className={`p-1 rounded-md transition-colors ${
                              idx === 0 ? 'text-slate-300 dark:text-zinc-600 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStepDown(idx)}
                            disabled={idx === formData.steps.length - 1}
                            title="Move Down"
                            className={`p-1 rounded-md transition-colors ${
                              idx === formData.steps.length - 1 ? 'text-slate-300 dark:text-zinc-600 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>

                        {/* Delete Step */}
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          title="Remove Task"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* 4. Schedule & Days */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Weekly Schedule
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    schedule: { weekdays: true, weekends: true, custom: [] },
                  })}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                >
                  All 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    schedule: { weekdays: true, weekends: false, custom: [1, 2, 3, 4, 5] },
                  })}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                >
                  Weekdays
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => {
                const isActive = (formData.schedule.custom && formData.schedule.custom.length > 0)
                  ? formData.schedule.custom.includes(day.value)
                  : ((day.value === 0 || day.value === 6) ? formData.schedule.weekends : formData.schedule.weekdays);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleCustomDay(day.value)}
                    className={`h-10 w-11 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Reminder Settings */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12141D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.reminderEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Habit Reminder</h3>
                  <p className="text-xs text-slate-500">Device notification alert for this ritual</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${formData.reminderEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${formData.reminderEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {formData.reminderEnabled && (
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-500" /> Reminder Time
                </label>
                <input
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12141D] text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Habit...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Create Habit</span>
                </>
              )}
            </button>
          </div>
        </form>
    </div>
  );
}
