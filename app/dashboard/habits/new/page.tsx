'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Sparkles, Zap, Target, Calendar, MessageCircle, FileText, Dumbbell, ListChecks, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const WORKOUT_SUGGESTIONS: Record<string, string[]> = {
  'Push Day': ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Lateral Raises', 'Tricep Dips', 'Tricep Pushdowns'],
  'Pull Day': ['Deadlift', 'Barbell Rows', 'Lat Pulldown', 'Face Pulls', 'Bicep Curls', 'Hammer Curls'],
  'Leg Day': ['Squats', 'Leg Press', 'Romanian Deadlift', 'Leg Curls', 'Calf Raises', 'Walking Lunges'],
  'Full Body': ['Squats', 'Bench Press', 'Rows', 'Overhead Press', 'Deadlift', 'Pull-ups'],
  'Cardio': ['Warm-up Jog', 'HIIT Intervals', 'Cool-down Walk', 'Stretching'],
  'Yoga': ['Sun Salutation', 'Warrior Poses', 'Balance Poses', 'Floor Stretches', 'Savasana'],
};

export default function NewHabitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Health' as string,
    type: 'single-step' as 'single-step' | 'multi-step',
    steps: [{ name: '', order: 0 }],
    targetPerDay: 1,
    description: '',
    descriptionEnabled: false,
    dynamicChecklist: false,
    checklistPrompt: '',
    schedule: {
      weekdays: true,
      weekends: true,
      custom: [] as number[]
    },
    inactiveAlertDays: 3,
    advancedMode: false,
    subActivities: [] as Array<{ name: string; type: string }>,
  });
  const [selectedWorkout, setSelectedWorkout] = useState<string>('');

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

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { name: '', order: formData.steps.length }]
    });
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, order: i }))
    });
  };

  const updateStep = (index: number, name: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], name };
    setFormData({ ...formData, steps: newSteps });
  };

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

  const addDefaultSubActivity = () => {
    setFormData({
      ...formData,
      subActivities: [...formData.subActivities, { name: '', type: 'text' }]
    });
  };

  const removeDefaultSubActivity = (index: number) => {
    setFormData({
      ...formData,
      subActivities: formData.subActivities.filter((_, i) => i !== index)
    });
  };

  const updateDefaultSubActivity = (index: number, field: string, value: string) => {
    const newSubActivities = [...formData.subActivities];
    newSubActivities[index] = { ...newSubActivities[index], [field]: value };
    setFormData({ ...formData, subActivities: newSubActivities });
  };

  const applyWorkoutSuggestion = (workoutType: string) => {
    setSelectedWorkout(workoutType);
    const exercises = WORKOUT_SUGGESTIONS[workoutType] || [];
    setFormData({
      ...formData,
      type: 'multi-step',
      steps: exercises.map((name, i) => ({ name, order: i })),
      checklistPrompt: `What workout are you doing today?`,
    });
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
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          type: formData.type,
          steps: formData.type === 'single-step'
            ? [{ name: formData.name.trim(), order: 0 }]
            : formData.steps.filter(s => s.name.trim()).map((s, i) => ({ ...s, order: i })),
          targetPerDay: formData.targetPerDay,
          description: formData.descriptionEnabled ? formData.description.trim() : '',
          descriptionEnabled: formData.descriptionEnabled,
          dynamicChecklist: formData.dynamicChecklist,
          checklistPrompt: formData.dynamicChecklist ? formData.checklistPrompt.trim() : '',
          schedule: formData.schedule,
          inactiveAlertDays: formData.inactiveAlertDays,
          advancedMode: formData.advancedMode,
          subActivities: formData.subActivities,
        })
      });

      if (res.ok) {
        toast.success('Habit created! 🎉');
        router.push('/dashboard/habits');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create habit');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Check if habit is fitness-related for workout suggestions
  const isFitnessHabit = formData.category === 'Fitness' ||
    formData.name.toLowerCase().includes('gym') ||
    formData.name.toLowerCase().includes('workout') ||
    formData.name.toLowerCase().includes('exercise');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 pb-20 pt-6">
      <div className="premium-container">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Back</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                New Habit
              </h1>
              <p className="text-zinc-500 text-sm mt-1 font-medium">Create a ritual that transforms your life</p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Name */}
          <div className="glass-card p-6">
            <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">Habit Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Meditation, Gym, Daily Reading..."
              className="input-modern"
              required
            />
          </div>

          {/* Category */}
          <div className="glass-card p-6">
            <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {categories.map((cat) => (
                <motion.button
                  key={cat.value}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${formData.category === cat.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg shadow-indigo-500/10'
                      : 'border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-300'
                    }`}
                >
                  <div className="text-xl mb-1">{cat.icon}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${formData.category === cat.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500'
                    }`}>{cat.label}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Description Toggle */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add Description</label>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, descriptionEnabled: !formData.descriptionEnabled })}
                className={`relative w-12 h-7 rounded-full transition-all duration-300 ${formData.descriptionEnabled
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
              >
                <motion.div
                  animate={{ x: formData.descriptionEnabled ? 22 : 3 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                />
              </button>
            </div>
            <AnimatePresence>
              {formData.descriptionEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your habit, why it matters, and how it fits your goals..."
                    rows={3}
                    className="input-modern mt-2 resize-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Type */}
          <div className="glass-card p-6">
            <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">Habit Type</label>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData({ ...formData, type: 'single-step' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.type === 'single-step'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg'
                    : 'border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
              >
                <Zap size={22} className={`mb-2 ${formData.type === 'single-step' ? 'text-indigo-600' : 'text-zinc-400'}`} />
                <div className={`text-sm font-bold ${formData.type === 'single-step' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500'}`}>Simple</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">One action</div>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData({ ...formData, type: 'multi-step' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.type === 'multi-step'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg'
                    : 'border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
              >
                <Target size={22} className={`mb-2 ${formData.type === 'multi-step' ? 'text-indigo-600' : 'text-zinc-400'}`} />
                <div className={`text-sm font-bold ${formData.type === 'multi-step' ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500'}`}>Multi-Step</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Checklist</div>
              </motion.button>
            </div>
          </div>

          {/* Target Per Day */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-indigo-500" />
              <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Target Per Day</label>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetPerDay: Math.max(1, formData.targetPerDay - 1) })}
                className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <ChevronDown size={20} />
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{formData.targetPerDay}</span>
                <p className="text-xs text-zinc-500 mt-1">times per day</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetPerDay: formData.targetPerDay + 1 })}
                className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <ChevronUp size={20} />
              </button>
            </div>
          </div>

          {/* Dynamic Checklist Toggle (for Gym / Fitness habits) */}
          {isFitnessHabit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="glass-card p-6 border-2 border-indigo-200/50 dark:border-indigo-800/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Dumbbell size={16} className="text-indigo-500" />
                  <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Workout Checklist
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, dynamicChecklist: !formData.dynamicChecklist })}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ${formData.dynamicChecklist
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                >
                  <motion.div
                    animate={{ x: formData.dynamicChecklist ? 22 : 3 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                  />
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-3">Auto-generate a workout checklist based on your exercise type</p>

              <AnimatePresence>
                {formData.dynamicChecklist && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Choose workout type:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.keys(WORKOUT_SUGGESTIONS).map((type) => (
                        <motion.button
                          key={type}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => applyWorkoutSuggestion(type)}
                          className={`p-3 rounded-xl text-xs font-bold transition-all ${selectedWorkout === type
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                        >
                          {type}
                        </motion.button>
                      ))}
                    </div>
                    {selectedWorkout && (
                      <div className="mt-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-800/30">
                        <div className="flex items-center gap-2 mb-2">
                          <ListChecks size={14} className="text-indigo-500" />
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Generated checklist applied to steps ↓</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Steps (for multi-step) */}
          {formData.type === 'multi-step' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Steps</label>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addStep}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus size={14} />
                  Add Step
                </motion.button>
              </div>
              <div className="space-y-2.5">
                <AnimatePresence>
                  {formData.steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder={`Step ${index + 1}...`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                      />
                      {formData.steps.length > 1 && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeStep(index)}
                          className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Advanced Mode Toggle */}
          <div className="glass-card p-6 border-2 border-indigo-200 dark:border-indigo-800/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.advancedMode ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                  <Zap size={22} className={formData.advancedMode ? 'text-white' : 'text-zinc-500'} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Advanced Mode
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Enable multi-input and sub-activity tracking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, advancedMode: !formData.advancedMode })}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${formData.advancedMode ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              >
                <motion.div
                  animate={{ x: formData.advancedMode ? 26 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                />
              </button>
            </div>

            {formData.advancedMode && (
              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Default Sub-Activities</label>
                  <button
                    type="button"
                    onClick={addDefaultSubActivity}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Activity
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.subActivities.map((sub, idx) => (
                    <div key={idx} className="flex gap-2 items-start group">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          placeholder="Activity name (e.g., Bench Press)"
                          value={sub.name}
                          onChange={(e) => updateDefaultSubActivity(idx, 'name', e.target.value)}
                          className="input-modern !py-2 text-sm"
                        />
                        <select
                          value={sub.type}
                          onChange={(e) => updateDefaultSubActivity(idx, 'type', e.target.value)}
                          className="input-modern !py-1.5 text-xs w-full"
                        >
                          <option value="text">Text Input</option>
                          <option value="kg">Weight (kg)</option>
                          <option value="reps">Reps</option>
                          <option value="duration">Time (min)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDefaultSubActivity(idx)}
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {formData.subActivities.length === 0 && (
                    <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs text-zinc-500 font-medium">No default sub-activities defined.</p>
                      <p className="text-[10px] text-zinc-400 mt-1">You can still add them dynamically while tracking.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="glass-card p-6">
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              <Calendar size={16} />
              Schedule
            </label>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {['Weekdays', 'Weekends'].map((label) => {
                  const key = label.toLowerCase() as 'weekdays' | 'weekends';
                  return (
                    <motion.button
                      key={label}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({
                        ...formData,
                        schedule: { ...formData.schedule, [key]: !formData.schedule[key] }
                      })}
                      className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${formData.schedule[key]
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                        }`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-500 mb-2">Or pick specific days:</div>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <motion.button
                      key={day.value}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleCustomDay(day.value)}
                      className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${formData.schedule.custom?.includes(day.value)
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                      {day.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-base shadow-xl shadow-indigo-500/30 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Creating...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Create Habit
              </>
            )}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}
