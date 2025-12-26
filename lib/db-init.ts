import connectDB from './mongodb';
import Preset from './models/Preset';
import { Preset as PresetType } from '@/types';

export async function initPresets() {
  await connectDB();

  const presets = [
    {
      name: 'Weekday Routine',
      type: 'weekday',
      structure: {
        habits: [
          { name: 'Wake up + Water', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Wake up and drink water' }], time: '05:00' },
          { name: 'Meditation/Breathing', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: '20 minutes meditation or breathing exercises' }], time: '05:10' },
          { name: 'Exercise/Stretch', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '45 minutes exercise or stretching' }], time: '05:30' },
          { name: 'Freshen up', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Shower and get ready' }], time: '06:15' },
          { name: 'Reading', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: '30 minutes reading' }], time: '06:45' },
          { name: 'Breakfast + Get Ready', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Eat breakfast and prepare for day' }], time: '07:15' },
          { name: 'Phone-free Time', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'No phone usage' }], time: '21:00' },
          { name: 'Sleep Prep', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Prepare for sleep' }], time: '21:45' },
        ]
      }
    },
    {
      name: 'Sunday Routine',
      type: 'sunday',
      structure: {
        habits: [
          { name: 'Wake + Light Stretch', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Wake up and light stretching' }], time: '05:30' },
          { name: 'Exercise/Walk', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '60 minutes exercise or walk' }], time: '06:00' },
          { name: 'Reading/News', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Read news or books' }], time: '07:00' },
          { name: 'Personal Learning', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: '2 hours personal learning' }], time: '08:00' },
          { name: 'Weekly Review/Planning', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review week and plan ahead' }], time: '16:00' },
        ]
      }
    },
    {
      name: 'Gym Routine',
      type: 'gym',
      structure: {
        habits: [
          { name: 'Monday: Push Day', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Bench Press (4x8)' },
            { order: 2, name: 'Overhead Press (4x8)' },
            { order: 3, name: 'Tricep Dips (3x10)' },
            { order: 4, name: 'Cool-down (10 min)' }
          ] },
          { name: 'Tuesday: Pull Day', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Deadlifts (4x6)' },
            { order: 2, name: 'Pull-ups (3x8)' },
            { order: 3, name: 'Rows (4x8)' },
            { order: 4, name: 'Cool-down (10 min)' }
          ] },
          { name: 'Wednesday: Legs Day', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Squats (4x8)' },
            { order: 2, name: 'Lunges (3x12)' },
            { order: 3, name: 'Leg Press (4x10)' },
            { order: 4, name: 'Cool-down (10 min)' }
          ] },
          { name: 'Thursday: Mobility', category: 'Fitness', type: 'single-step', steps: [
            { order: 0, name: '30-45 minutes mobility and stretching' }
          ] },
          { name: 'Friday: Full Body', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (10 min)' },
            { order: 1, name: 'Compound movements (30 min)' },
            { order: 2, name: 'Cardio (20 min)' },
            { order: 3, name: 'Cool-down (10 min)' }
          ] },
        ]
      }
    },
    {
      name: 'Diet Guidelines',
      type: 'diet',
      structure: {
        habits: [
          { name: 'Hydration', category: 'Health', type: 'multi-step', steps: [
            { order: 0, name: '1 glass of water (250ml)' },
            { order: 1, name: '2 glasses of water (500ml)' },
            { order: 2, name: '3 glasses of water (750ml)' },
            { order: 3, name: '4 glasses of water (1L)' },
            { order: 4, name: '5 glasses of water (1.25L)' },
            { order: 5, name: '6 glasses of water (1.5L)' },
            { order: 6, name: '7 glasses of water (1.75L)' },
            { order: 7, name: '8 glasses of water (2L)' }
          ] },
          { name: 'Protein Intake', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Meet daily protein goal (0.8-1.2g per kg body weight)' }
          ] },
          { name: 'Fiber Intake', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Consume 25-38g fiber daily' }
          ] },
          { name: 'Balanced Meals', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Include protein, fiber, and healthy fats in each meal' }
          ] },
        ]
      }
    },
    {
      name: 'Morning Productivity',
      type: 'morning-productivity',
      structure: {
        habits: [
          { name: 'Wake Up Early', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Wake up at consistent time' }], time: '06:00' },
          { name: 'Morning Meditation', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: '10-15 minutes meditation' }], time: '06:10' },
          { name: 'Journaling', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Write morning pages or gratitude journal' }], time: '06:25' },
          { name: 'Exercise', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '30 minutes morning workout' }], time: '06:40' },
          { name: 'Healthy Breakfast', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Nutritious breakfast' }], time: '07:15' },
          { name: 'Plan Your Day', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review goals and plan tasks' }], time: '07:30' },
        ]
      }
    },
    {
      name: 'Evening Wind-Down',
      type: 'evening-winddown',
      structure: {
        habits: [
          { name: 'Digital Detox', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'No screens 1 hour before bed' }], time: '21:00' },
          { name: 'Evening Reflection', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Reflect on the day' }], time: '21:15' },
          { name: 'Reading', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Read for 30 minutes' }], time: '21:30' },
          { name: 'Prepare Tomorrow', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Set clothes and essentials for next day' }], time: '22:00' },
          { name: 'Relaxation', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Light stretching or breathing exercises' }], time: '22:15' },
          { name: 'Sleep Routine', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Consistent bedtime routine' }], time: '22:30' },
        ]
      }
    },
    {
      name: 'Study & Learning',
      type: 'study-learning',
      structure: {
        habits: [
          { name: 'Morning Study Session', category: 'Productivity', type: 'multi-step', steps: [
            { order: 0, name: 'Review previous notes (15 min)' },
            { order: 1, name: 'Read new material (30 min)' },
            { order: 2, name: 'Take notes (20 min)' },
            { order: 3, name: 'Practice problems (25 min)' }
          ], time: '09:00' },
          { name: 'Language Practice', category: 'Productivity', type: 'multi-step', steps: [
            { order: 0, name: 'Vocabulary review (10 min)' },
            { order: 1, name: 'Grammar exercises (15 min)' },
            { order: 2, name: 'Speaking practice (15 min)' },
            { order: 3, name: 'Listening practice (20 min)' }
          ], time: '14:00' },
          { name: 'Evening Review', category: 'Productivity', type: 'single-step', steps: [{ order: 0, name: 'Review and consolidate learning' }], time: '19:00' },
        ]
      }
    },
    {
      name: 'Weight Loss Plan',
      type: 'weight-loss',
      structure: {
        habits: [
          { name: 'Morning Water', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Drink 500ml water on waking' }], time: '07:00' },
          { name: 'Cardio Exercise', category: 'Fitness', type: 'multi-step', steps: [
            { order: 0, name: 'Warm-up (5 min)' },
            { order: 1, name: 'Cardio (30-45 min)' },
            { order: 2, name: 'Cool-down (5 min)' }
          ], time: '08:00' },
          { name: 'Healthy Breakfast', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'High-protein, low-calorie breakfast' }], time: '09:00' },
          { name: 'Portion Control', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'Measure portions for all meals' }] },
          { name: 'Track Calories', category: 'Diet', type: 'single-step', steps: [{ order: 0, name: 'Log all meals and snacks' }] },
          { name: 'Evening Walk', category: 'Fitness', type: 'single-step', steps: [{ order: 0, name: '30-minute evening walk' }], time: '18:00' },
        ]
      }
    },
    {
      name: 'Mental Health & Wellness',
      type: 'mental-health',
      structure: {
        habits: [
          { name: 'Morning Gratitude', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Write 3 things you are grateful for' }], time: '07:00' },
          { name: 'Meditation', category: 'Mindfulness', type: 'multi-step', steps: [
            { order: 0, name: 'Find quiet space (2 min)' },
            { order: 1, name: 'Focus on breathing (10 min)' },
            { order: 2, name: 'Body scan (5 min)' },
            { order: 3, name: 'Reflection (3 min)' }
          ], time: '08:00' },
          { name: 'Nature Time', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Spend 20 minutes in nature' }], time: '12:00' },
          { name: 'Social Connection', category: 'Health', type: 'single-step', steps: [{ order: 0, name: 'Connect with friend or family member' }], time: '17:00' },
          { name: 'Evening Journal', category: 'Mindfulness', type: 'single-step', steps: [{ order: 0, name: 'Write about your day and feelings' }], time: '20:00' },
        ]
      }
    },
    {
      name: 'Lean Bulk Diet Plan',
      type: 'lean-bulk',
      structure: {
        habits: [
          { name: 'Morning Meal', category: 'Diet', type: 'multi-step', steps: [
            { order: 0, name: 'High-protein breakfast (eggs, Greek yogurt)' },
            { order: 1, name: 'Complex carbs (oatmeal, whole grains)' },
            { order: 2, name: 'Fruits and vegetables' }
          ] },
          { name: 'Pre-Workout Meal', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Light carbs + protein 1 hour before' }
          ] },
          { name: 'Post-Workout Meal', category: 'Diet', type: 'multi-step', steps: [
            { order: 0, name: 'Protein shake (whey or plant-based)' },
            { order: 1, name: 'Moderate carbs (brown rice, quinoa)' },
            { order: 2, name: 'Lean protein (chicken breast, fish)' }
          ] },
          { name: 'Daily Calorie Surplus', category: 'Diet', type: 'single-step', steps: [
            { order: 0, name: 'Track calories: +200-300 above maintenance' }
          ] },
          { name: 'Evening Meal', category: 'Diet', type: 'multi-step', steps: [
            { order: 0, name: 'Lean protein (25-35g)' },
            { order: 1, name: 'Vegetables (broccoli, spinach, etc.)' },
            { order: 2, name: 'Healthy fats (olive oil, avocado)' }
          ] },
          { name: 'Hydration', category: 'Health', type: 'multi-step', steps: [
            { order: 0, name: '3-4 liters water daily' },
            { order: 1, name: 'Electrolytes if needed' }
          ] },
        ]
      }
    },
  ];

  for (const preset of presets) {
    await Preset.findOneAndUpdate(
      { type: preset.type },
      preset,
      { upsert: true, new: true }
    );
  }
}

