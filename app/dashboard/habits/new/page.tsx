'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Sparkles, Zap, Target, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function NewHabitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Health' as 'Health' | 'Productivity' | 'Mindset' | 'Growth' | 'Other' | 'Fitness' | 'Diet' | 'Mindfulness',
    type: 'single-step' as 'single-step' | 'multi-step',
    steps: [{ name: '', order: 0 }],
    targetPerDay: 1,
    schedule: {
      weekdays: true,
      weekends: true,
      custom: [] as number[]
    }
  });

  const categories = [
    { value: 'Health', label: 'Health', icon: '💚', color: 'emerald' },
    { value: 'Fitness', label: 'Fitness', icon: '💪', color: 'orange' },
    { value: 'Productivity', label: 'Productivity', icon: '⚡', color: 'blue' },
    { value: 'Mindfulness', label: 'Mindfulness', icon: '🧘', color: 'purple' },
    { value: 'Growth', label: 'Growth', icon: '🌱', color: 'amber' },
    { value: 'Diet', label: 'Diet', icon: '🥗', color: 'green' },
    { value: 'Other', label: 'Other', icon: '✨', color: 'slate' },
  ];

  const weekDays = [
    { value: 0, label: 'Sun', full: 'Sunday' },
    { value: 1, label: 'Mon', full: 'Monday' },
    { value: 2, label: 'Tue', full: 'Tuesday' },
    { value: 3, label: 'Wed', full: 'Wednesday' },
    { value: 4, label: 'Thu', full: 'Thursday' },
    { value: 5, label: 'Fri', full: 'Friday' },
    { value: 6, label: 'Sat', full: 'Saturday' },
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
          schedule: formData.schedule
        })
      });

      if (res.ok) {
        toast.success('Habit created successfully! 🎉');
        router.push('/dashboard/habits');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create habit');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 pb-20 pt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                Create New Habit
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                Build a ritual that transforms your life
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Habit Name */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Habit Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Meditation, Daily Reading..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
              required
            />
          </div>

          {/* Category */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <motion.button
                  key={cat.value}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({ ...formData, category: cat.value as any })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.category === cat.value
                      ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20 shadow-lg`
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className={`text-xs font-semibold ${
                    formData.category === cat.value
                      ? `text-${cat.color}-700 dark:text-${cat.color}-400`
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {cat.label}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Habit Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData({ ...formData, type: 'single-step' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'single-step'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <Zap size={24} className={`mb-2 ${formData.type === 'single-step' ? 'text-indigo-600' : 'text-zinc-400'}`} />
                <div className={`text-sm font-semibold ${formData.type === 'single-step' ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  Simple
                </div>
                <div className="text-xs text-zinc-500 mt-1">One action</div>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData({ ...formData, type: 'multi-step' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'multi-step'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <Target size={24} className={`mb-2 ${formData.type === 'multi-step' ? 'text-indigo-600' : 'text-zinc-400'}`} />
                <div className={`text-sm font-semibold ${formData.type === 'multi-step' ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  Multi-Step
                </div>
                <div className="text-xs text-zinc-500 mt-1">Checklist</div>
              </motion.button>
            </div>
          </div>

          {/* Steps */}
          {formData.type === 'multi-step' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Steps
                </label>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addStep}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus size={16} />
                  Add Step
                </motion.button>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {formData.steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder={`Step ${index + 1}...`}
                        className="flex-1 px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                      />
                      {formData.steps.length > 1 && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeStep(index)}
                          className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <X size={16} />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Schedule */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <Calendar size={16} />
              Schedule
            </label>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, weekdays: !formData.schedule.weekdays }
                  })}
                  className={`px-4 py-2 rounded-xl border-2 transition-all ${
                    formData.schedule.weekdays
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Weekdays
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, weekends: !formData.schedule.weekends }
                  })}
                  className={`px-4 py-2 rounded-xl border-2 transition-all ${
                    formData.schedule.weekends
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Weekends
                </motion.button>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Or select specific days:</div>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <motion.button
                      key={day.value}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleCustomDay(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        formData.schedule.custom?.includes(day.value)
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
