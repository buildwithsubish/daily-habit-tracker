import connectDB from './mongodb';
import Preset from './models/Preset';

export async function initPresets() {
  await connectDB();

  const presets = [
    {
      name: 'Atomic Routine',
      type: 'atomic-habits',
      description: 'Small changes that lead to remarkable results. Focus on consistency.',
      category: 'Productivity',
      structure: {
        habits: [
          { name: 'Make Bed', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'First win of the day' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Read 10 Pages', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Knowledge compound interest' }], schedule: { weekdays: true, weekends: true } },
          { name: '1% Better', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Reflect on one small improvement' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Weekend Warrior',
      type: 'weekend-routine',
      description: 'Maximize your weekends with active recovery and planning.',
      category: 'Health',
      structure: {
        habits: [
          { name: 'Nature Walk', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '60-minute walk in nature' }], schedule: { weekdays: false, weekends: true } },
          { name: 'Weekly Review', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review last week and plan next' }], schedule: { weekdays: false, weekends: true } },
          { name: 'Long Meal Prep', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'Prepare meals for the week' }], schedule: { weekdays: false, weekends: true } }
        ]
      }
    },
    {
      name: 'High Performance',
      type: 'gym',
      description: 'Designed for those who want to push their physical and mental limits.',
      category: 'Fitness',
      structure: {
        habits: [
          { name: 'Weight Training', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Heavy lifting session' },
            { order: 1, name: 'High intensity finish' }
          ], schedule: { weekdays: true, weekends: false } },
          { name: 'Cold Shower', category: 'Health', type: 'single-step', steps: [{ order: 0, name: '3-minute cold exposure' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Deep Work', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: '90 minutes of focused work' }], schedule: { weekdays: true, weekends: false } }
        ]
      }
    },
    {
      name: 'Zen Master',
      type: 'mental-health',
      description: 'Find peace and clarity in a chaotic world.',
      category: 'Mindfulness',
      structure: {
        habits: [
          { name: 'Morning Meditation', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: '20 minutes of mindfulness' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Digital Minimalism', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'No social media until noon' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Tea Ceremony', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Mindful preparation of tea' }], schedule: { weekdays: false, weekends: true } }
        ]
      }
    },
    {
      name: 'Lean Shred',
      type: 'lean-bulk',
      description: 'Optimal habits for fat loss while maintaining muscle mass.',
      category: 'Diet',
      structure: {
        habits: [
          { name: 'Fasted Cardio', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '30 min light cardio before breakfast' }], schedule: { weekdays: true, weekends: true } },
          { name: 'High Protein', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'Track protein: 2g per kg BW' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Step Target', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: 'Reach 12,000 steps' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    },
    {
      name: 'Mass Gainer',
      type: 'bulking',
      description: 'Focus on calorie surplus and progressive overload.',
      category: 'Diet',
      structure: {
        habits: [
          { name: 'Calorie Surplus', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'Eat 500 kcal above maintenance' }], schedule: { weekdays: true, weekends: true } },
          { name: 'Progressive Overload', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: 'Add weight or reps to lifts' }], schedule: { weekdays: true, weekends: false } },
          { name: 'Sleep 8h+', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Quality recovery for muscle growth' }], schedule: { weekdays: true, weekends: true } }
        ]
      }
    }
  ];

  for (const preset of presets) {
    await Preset.findOneAndUpdate(
      { type: preset.type },
      preset,
      { upsert: true, new: true }
    );
  }
}
